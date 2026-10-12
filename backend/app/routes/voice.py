"""API Endpoints and WebSocket Streaming for Faster-Whisper Speech-to-Text."""

import json
import uuid
import asyncio
from typing import Optional
from fastapi import APIRouter, File, UploadFile, Request, WebSocket, WebSocketDisconnect, HTTPException, Query
from pydantic import BaseModel

from app.services.whisper_service import (
    get_whisper_status,
    get_whisper_model,
    transcribe_audio_bytes,
    transcribe_live_stream_chunk,
)

router = APIRouter(prefix="/api/voice", tags=["voice_faster_whisper"])


class TranscribeResponse(BaseModel):
    status: str
    engine: str
    text: str
    duration: float
    segments: list
    language: str


@router.get("/status")
async def voice_status():
    """Retrieve Faster-Whisper engine status and operational health."""
    status = get_whisper_status()
    return status


@router.post("/transcribe")
async def transcribe_audio_endpoint(
    request: Request,
    file: Optional[UploadFile] = File(None),
    language: Optional[str] = Query("en"),
):
    """Transcribe an uploaded audio file (WebM, WAV, MP3, OGG, M4A) via Faster-Whisper."""
    audio_bytes = b""
    filename = "audio.webm"

    if file is not None:
        filename = file.filename or "audio.webm"
        audio_bytes = await file.read()
    else:
        # Fallback to reading raw body
        audio_bytes = await request.body()
        content_type = request.headers.get("content-type", "")
        if "wav" in content_type:
            filename = "audio.wav"
        elif "ogg" in content_type:
            filename = "audio.ogg"
        elif "mp3" in content_type:
            filename = "audio.mp3"

    if not audio_bytes or len(audio_bytes) < 100:
        raise HTTPException(status_code=400, detail="No audio data received or file too small")

    # Run transcription in threadpool to prevent blocking the event loop
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None,
        lambda: transcribe_audio_bytes(
            audio_bytes=audio_bytes,
            filename_hint=filename,
            language=language or "en",
        )
    )

    return {
        "status": "success",
        "engine": "Faster-Whisper",
        "text": result.get("text", ""),
        "duration": result.get("duration", 0.0),
        "segments": result.get("segments", []),
        "language": result.get("language", "en"),
    }


@router.post("/transcribe-chunk")
async def transcribe_chunk_endpoint(
    request: Request,
    file: Optional[UploadFile] = File(None),
    language: Optional[str] = Query("en"),
    is_final: Optional[bool] = Query(False),
):
    """Fast, low-latency live chunk transcription for continuous speech translation."""
    audio_bytes = b""
    filename = "chunk.webm"

    if file is not None:
        filename = file.filename or "chunk.webm"
        audio_bytes = await file.read()
    else:
        audio_bytes = await request.body()

    if not audio_bytes or len(audio_bytes) < 100:
        return {
            "status": "success",
            "engine": "Faster-Whisper",
            "text": "",
            "interim": "",
            "is_final": bool(is_final),
        }

    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None,
        lambda: transcribe_live_stream_chunk(
            audio_bytes=audio_bytes,
            language=language or "en",
            filename_hint=filename,
        )
    )

    text = result.get("text", "").strip()

    return {
        "status": "success",
        "engine": "Faster-Whisper",
        "text": text,
        "interim": text,
        "duration": result.get("duration", 0.0),
        "is_final": bool(is_final),
    }


@router.websocket("/stream")
async def voice_streaming_websocket(websocket: WebSocket):
    """High-speed WebSocket connection for real-time live speech-to-text with Faster-Whisper.
    
    Streams live word-by-word transcription as the user speaks into their microphone.
    """
    await websocket.accept()

    # Pre-warm model in background if not already loaded
    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, get_whisper_model)
    except Exception as e:
        print(f"[WebSocket] Model warm-up warning: {e}", flush=True)

    await websocket.send_json({
        "type": "connected",
        "engine": "Faster-Whisper",
        "model": "base.en",
        "status": "ready",
        "message": "Faster-Whisper live speech-to-text pipeline ready"
    })

    # Buffer for collecting ongoing audio chunks in this session
    audio_buffer = bytearray()
    last_transcribed_text = ""
    session_id = str(uuid.uuid4())

    try:
        while True:
            message = await websocket.receive()
            if "bytes" in message and message["bytes"]:
                chunk = message["bytes"]
                audio_buffer.extend(chunk)

                # Process if we have sufficient audio data (> 2KB)
                if len(audio_buffer) >= 2000:
                    current_bytes = bytes(audio_buffer)
                    # Transcribe current cumulative audio in threadpool
                    res = await loop.run_in_executor(
                        None,
                        lambda: transcribe_live_stream_chunk(current_bytes, language="en", filename_hint="stream.webm")
                    )
                    text = res.get("text", "").strip()
                    if text:
                        last_transcribed_text = text
                        await websocket.send_json({
                            "type": "transcript",
                            "engine": "Faster-Whisper",
                            "text": text,
                            "interim": text,
                            "is_final": False,
                            "duration": res.get("duration", 0.0),
                            "session_id": session_id
                        })
                    else:
                        await websocket.send_json({
                            "type": "silence",
                            "engine": "Faster-Whisper",
                            "is_final": False
                        })

            elif "text" in message and message["text"]:
                try:
                    data = json.loads(message["text"])
                except Exception:
                    data = {"action": message["text"]}

                action = data.get("action", "")

                if action == "reset":
                    audio_buffer.clear()
                    last_transcribed_text = ""
                    await websocket.send_json({"type": "reset", "status": "cleared"})

                elif action in ("finalize", "stop"):
                    # Produce final transcription on full buffer
                    if len(audio_buffer) >= 500:
                        final_bytes = bytes(audio_buffer)
                        res = await loop.run_in_executor(
                            None,
                            lambda: transcribe_audio_bytes(final_bytes, filename_hint="final.webm", language="en")
                        )
                        final_text = res.get("text", "").strip() or last_transcribed_text
                    else:
                        final_text = last_transcribed_text

                    await websocket.send_json({
                        "type": "final",
                        "engine": "Faster-Whisper",
                        "text": final_text,
                        "is_final": True,
                        "session_id": session_id
                    })
                    audio_buffer.clear()
                    last_transcribed_text = ""

                elif action == "ping":
                    await websocket.send_json({"type": "pong", "time": asyncio.get_event_loop().time()})

    except WebSocketDisconnect:
        # Client gracefully closed connection
        pass
    except Exception as e:
        print(f"[WebSocket] Error during audio stream: {e}", flush=True)
        try:
            await websocket.send_json({"type": "error", "error": str(e)})
        except Exception:
            pass
    finally:
        audio_buffer.clear()
