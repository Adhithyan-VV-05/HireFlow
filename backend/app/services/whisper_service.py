"""Faster-Whisper Speech-to-Text Service for HireFlow AI.

Provides high-performance, real-time transcription using Faster-Whisper (CTranslate2).
Supports in-memory WAV/PCM decoding, file uploads, raw audio byte streams (WAV, WebM Opus, MP3, OGG),
and low-latency chunked live streaming over WebSockets and HTTP.
"""

import os
import io
import wave
import tempfile
import threading
import time
from typing import Optional, Dict, Any, List, Tuple
import numpy as np

_whisper_lock = threading.Lock()
_whisper_model = None
_model_config = {
    "model_size": os.getenv("WHISPER_MODEL", "base.en"),
    "device": "cpu",
    "compute_type": "int8",
    "is_loaded": False,
    "load_time_seconds": 0.0,
}


def get_whisper_model():
    """Retrieve or lazily initialize the singleton Faster-Whisper model."""
    global _whisper_model, _model_config

    if _whisper_model is not None:
        return _whisper_model

    with _whisper_lock:
        if _whisper_model is not None:
            return _whisper_model

        start_t = time.time()
        from faster_whisper import WhisperModel

        device = "cpu"
        compute_type = "int8"

        # Check for CUDA availability
        try:
            import torch
            if torch.cuda.is_available():
                device = "cuda"
                compute_type = "float16"
        except Exception:
            pass

        print(f"[Faster-Whisper] Loading model '{_model_config['model_size']}' on {device} ({compute_type})...", flush=True)

        try:
            model = WhisperModel(
                _model_config["model_size"],
                device=device,
                compute_type=compute_type,
                cpu_threads=4,
            )
        except Exception as e:
            print(f"[Faster-Whisper] Failed with compute_type={compute_type}, falling back to float32 on cpu: {e}", flush=True)
            device = "cpu"
            compute_type = "float32"
            model = WhisperModel(
                _model_config["model_size"],
                device=device,
                compute_type=compute_type,
                cpu_threads=4,
            )

        load_dur = round(time.time() - start_t, 2)
        print(f"[Faster-Whisper] Model loaded successfully in {load_dur}s!", flush=True)

        _model_config["device"] = device
        _model_config["compute_type"] = compute_type
        _model_config["is_loaded"] = True
        _model_config["load_time_seconds"] = load_dur
        _whisper_model = model
        return _whisper_model


def get_whisper_status() -> Dict[str, Any]:
    """Return runtime metadata and health status for the Faster-Whisper engine."""
    return {
        "engine": "Faster-Whisper",
        "ready": True,
        "is_loaded": _whisper_model is not None,
        "model_size": _model_config["model_size"],
        "device": _model_config["device"],
        "compute_type": _model_config["compute_type"],
        "load_time_seconds": _model_config["load_time_seconds"],
    }


def _extract_audio_from_wav_bytes(audio_bytes: bytes) -> Optional[np.ndarray]:
    """In-memory extraction of 16kHz float32 mono audio from WAV bytes."""
    try:
        with wave.open(io.BytesIO(audio_bytes), "rb") as wf:
            channels = wf.getnchannels()
            framerate = wf.getframerate()
            sampwidth = wf.getsampwidth()
            nframes = wf.getnframes()
            if nframes == 0:
                return None
            raw_data = wf.readframes(nframes)

        if sampwidth == 2:
            samples = np.frombuffer(raw_data, dtype=np.int16).astype(np.float32) / 32768.0
        elif sampwidth == 1:
            samples = np.frombuffer(raw_data, dtype=np.uint8).astype(np.float32) / 128.0 - 1.0
        elif sampwidth == 4:
            samples = np.frombuffer(raw_data, dtype=np.int32).astype(np.float32) / 2147483648.0
        else:
            return None

        # Convert multi-channel to mono
        if channels > 1:
            samples = samples.reshape(-1, channels).mean(axis=1)

        # Resample to 16,000 Hz if necessary
        if framerate != 16000 and len(samples) > 0:
            try:
                import scipy.signal
                num_target_samples = int(len(samples) * 16000 / framerate)
                samples = scipy.signal.resample(samples, num_target_samples).astype(np.float32)
            except Exception:
                pass

        return samples
    except Exception as e:
        return None


def transcribe_audio_bytes(
    audio_bytes: bytes,
    filename_hint: str = "audio.wav",
    language: str = "en",
    beam_size: int = 1,
    vad_filter: bool = True,
) -> Dict[str, Any]:
    """Transcribe raw audio bytes using Faster-Whisper.
    
    Prefers zero-copy in-memory WAV decoding; falls back to PyAV container demuxing.
    """
    if not audio_bytes or len(audio_bytes) < 44:
        return {
            "text": "",
            "segments": [],
            "language": language,
            "duration": 0.0,
            "empty": True,
        }

    model = get_whisper_model()

    # 1. Check if the audio is standard WAV (RIFF/WAVE)
    is_wav = len(audio_bytes) >= 12 and audio_bytes[:4] == b"RIFF" and audio_bytes[8:12] == b"WAVE"
    audio_input = None

    if is_wav:
        audio_input = _extract_audio_from_wav_bytes(audio_bytes)

    # 2. If decoded to numpy array in memory, transcribe directly without disk I/O!
    if audio_input is not None and len(audio_input) > 0:
        try:
            duration = float(len(audio_input) / 16000.0)
            # If silence / volume is essentially zero, return empty cleanly
            max_amp = float(np.max(np.abs(audio_input))) if len(audio_input) > 0 else 0.0
            if max_amp < 0.005:
                return {
                    "text": "",
                    "segments": [],
                    "language": language,
                    "duration": round(duration, 2),
                    "empty": True,
                }

            segments_iter, info = model.transcribe(
                audio_input,
                language=language if language != "auto" else None,
                beam_size=beam_size,
                vad_filter=vad_filter,
                vad_parameters=dict(min_silence_duration_ms=300),
                word_timestamps=False,
            )

            segments_list = []
            full_text_parts = []
            for s in segments_iter:
                clean_text = s.text.strip()
                if clean_text:
                    full_text_parts.append(clean_text)
                    segments_list.append({
                        "id": s.id,
                        "start": round(s.start, 2),
                        "end": round(s.end, 2),
                        "text": clean_text,
                        "confidence": round(float(getattr(s, "avg_logprob", 0.0)), 3),
                    })

            full_text = " ".join(full_text_parts).strip()
            return {
                "text": full_text,
                "segments": segments_list,
                "language": getattr(info, "language", language),
                "language_probability": round(float(getattr(info, "language_probability", 1.0)), 2),
                "duration": round(duration, 2),
                "empty": len(full_text) == 0,
            }
        except Exception as e:
            print(f"[Faster-Whisper] Numpy in-memory transcription warning: {e}", flush=True)

    # 3. Fallback to PyAV file demuxing for WebM / MP3 / OGG files
    # Auto-detect container format from audio header magic bytes
    ext = ".webm"
    if len(audio_bytes) >= 4 and audio_bytes[:4] == b"RIFF":
        ext = ".wav"
    elif len(audio_bytes) >= 4 and audio_bytes[:4] == b"\x1a\x45\xdf\xa3":
        ext = ".webm"
    elif len(audio_bytes) >= 4 and audio_bytes[:4] == b"OggS":
        ext = ".ogg"
    elif len(audio_bytes) >= 3 and (audio_bytes[:3] == b"ID3" or audio_bytes[:2] == b"\xff\xfb" or audio_bytes[:2] == b"\xff\xf3"):
        ext = ".mp3"
    elif len(audio_bytes) >= 8 and audio_bytes[4:8] == b"ftyp":
        ext = ".mp4"
    elif filename_hint:
        lower = filename_hint.lower()
        for candidate_ext in [".wav", ".webm", ".ogg", ".mp3", ".m4a", ".mp4", ".flac"]:
            if lower.endswith(candidate_ext):
                ext = candidate_ext
                break

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(audio_bytes)
            temp_path = tmp.name

        segments_iter, info = model.transcribe(
            temp_path,
            language=language if language != "auto" else None,
            beam_size=beam_size,
            vad_filter=vad_filter,
            vad_parameters=dict(min_silence_duration_ms=300),
            word_timestamps=False,
        )

        segments_list = []
        full_text_parts = []
        for s in segments_iter:
            clean_text = s.text.strip()
            if clean_text:
                full_text_parts.append(clean_text)
                segments_list.append({
                    "id": s.id,
                    "start": round(s.start, 2),
                    "end": round(s.end, 2),
                    "text": clean_text,
                    "confidence": round(float(getattr(s, "avg_logprob", 0.0)), 3),
                })

        full_text = " ".join(full_text_parts).strip()

        return {
            "text": full_text,
            "segments": segments_list,
            "language": getattr(info, "language", language),
            "language_probability": round(float(getattr(info, "language_probability", 1.0)), 2),
            "duration": round(float(getattr(info, "duration", 0.0)), 2),
            "empty": len(full_text) == 0,
        }
    except Exception as e:
        print(f"[Faster-Whisper] Fallback transcription notice: {e}", flush=True)
        return {
            "text": "",
            "error": str(e),
            "segments": [],
            "duration": 0.0,
            "empty": True,
        }
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception:
                pass


def transcribe_live_stream_chunk(
    audio_bytes: bytes,
    language: str = "en",
    filename_hint: str = "stream.wav",
) -> Dict[str, Any]:
    """Low-latency transcription for live streaming chunks."""
    return transcribe_audio_bytes(
        audio_bytes=audio_bytes,
        filename_hint=filename_hint,
        language=language,
        beam_size=1,
        vad_filter=True,
    )
