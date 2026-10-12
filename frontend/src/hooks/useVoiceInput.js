import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/client';

/**
 * Helper to retrieve SpeechRecognition constructor across browsers.
 * Native Web Speech API is supported in Chrome, Edge, Safari, Brave, and Chromium browsers.
 */
export function getSpeechRecognitionClass() {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/**
 * Determine supported audio MIME type for MediaRecorder.
 */
function getBestAudioMimeType() {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return '';
    const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
    ];
    for (const t of candidates) {
        if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
}

/**
 * useVoiceInput
 *
 * Production-ready speech-to-text hook for HireFlow AI.
 * Solves:
 * 1. Text wiping / going blank on pauses (accumulates transcripts across recognition restarts).
 * 2. Instant real-time word-by-word streaming into input fields as user speaks.
 * 3. Hardware concurrency: safe audio capture for live volume meter + neural recognition.
 * 4. Dual-Engine Architecture:
 *    - Web Speech API for 0ms live typing in Chrome/Edge/Safari.
 *    - Faster-Whisper (base.en) neural model for backup transcription & non-WebSpeech browsers.
 * 5. Simulated voice input for instant demoing and test validation.
 */
export function useVoiceInput({
    onTranscriptChange,
    lang = 'en-US',
} = {}) {
    const [isListening, setIsListening] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimText, setInterimText] = useState('');
    const [audioLevel, setAudioLevel] = useState(0);
    const [error, setError] = useState('');
    const [recognitionEngine, setRecognitionEngine] = useState('Web Speech (Live Neural)');
    const [isSupported, setIsSupported] = useState(true);
    const [engineStatus, setEngineStatus] = useState({ ready: true, engine: 'Faster-Whisper', model: 'base.en' });

    // Persistent transcript buffers across pauses and restarts
    const isListeningRef = useRef(false);
    const shouldRestartRef = useRef(false);
    const isSpeakingRef = useRef(false);
    const baseTextRef = useRef('');
    const accumulatedFinalRef = useRef('');
    const sessionFinalRef = useRef('');
    const currentInterimRef = useRef('');
    const onTranscriptChangeRef = useRef(onTranscriptChange);
    const langRef = useRef(lang);

    // Audio & Streaming Refs
    const mediaStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animFrameRef = useRef(null);
    const convertingTimeoutRef = useRef(null);
    const simulationIntervalRef = useRef(null);
    const recognitionRef = useRef(null);

    // Keep callback and language refs synchronized
    useEffect(() => {
        onTranscriptChangeRef.current = onTranscriptChange;
    }, [onTranscriptChange]);

    useEffect(() => {
        langRef.current = lang;
    }, [lang]);

    // Check support and backend Faster-Whisper status on mount
    useEffect(() => {
        const SpeechClass = getSpeechRecognitionClass();
        const hasUserMedia = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
        setIsSupported(Boolean(SpeechClass || hasUserMedia));

        let mounted = true;
        api.getVoiceStatus()
            .then((status) => {
                if (mounted && status) {
                    setEngineStatus(status);
                }
            })
            .catch(() => {});

        return () => {
            mounted = false;
        };
    }, []);

    // Full audio & recognition cleanup
    const cleanupAudio = useCallback(() => {
        shouldRestartRef.current = false;

        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }

        if (recognitionRef.current) {
            try {
                recognitionRef.current.onresult = null;
                recognitionRef.current.onend = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.stop();
            } catch (e) {}
            recognitionRef.current = null;
        }

        if (mediaRecorderRef.current) {
            try {
                if (mediaRecorderRef.current.state !== 'inactive') {
                    mediaRecorderRef.current.stop();
                }
            } catch (e) {}
            mediaRecorderRef.current = null;
        }

        if (mediaStreamRef.current) {
            try {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            } catch (e) {}
            mediaStreamRef.current = null;
        }

        if (audioContextRef.current) {
            try {
                if (audioContextRef.current.state !== 'closed') {
                    audioContextRef.current.close();
                }
            } catch (e) {}
            audioContextRef.current = null;
        }

        if (simulationIntervalRef.current) {
            clearInterval(simulationIntervalRef.current);
            simulationIntervalRef.current = null;
        }

        if (convertingTimeoutRef.current) {
            clearTimeout(convertingTimeoutRef.current);
            convertingTimeoutRef.current = null;
        }

        setAudioLevel(0);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        setIsConverting(false);
    }, []);

    // Start Web Audio Level Analyser for real-time waveform visualization
    const startAudioMeter = useCallback((stream) => {
        if (typeof window === 'undefined') return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;

            const ctx = new AudioCtx();
            audioContextRef.current = ctx;

            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.4;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const checkLevel = () => {
                if (!isListeningRef.current || !analyserRef.current) {
                    setAudioLevel(0);
                    setIsSpeaking(false);
                    isSpeakingRef.current = false;
                    return;
                }
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                const normalized = Math.min(100, Math.round((avg / 128) * 100 * 2.2));
                setAudioLevel(normalized);

                if (normalized > 7) {
                    setIsSpeaking(true);
                    isSpeakingRef.current = true;
                    setIsConverting(true);
                    if (convertingTimeoutRef.current) clearTimeout(convertingTimeoutRef.current);
                } else {
                    setIsSpeaking(false);
                    isSpeakingRef.current = false;
                }

                animFrameRef.current = requestAnimationFrame(checkLevel);
            };

            animFrameRef.current = requestAnimationFrame(checkLevel);
        } catch (err) {
            console.warn('[useVoiceInput] Audio meter warning:', err);
        }
    }, []);

    // Stop listening explicitly
    const stopListening = useCallback(() => {
        isListeningRef.current = false;
        shouldRestartRef.current = false;
        setIsListening(false);

        // Merge any current session final into accumulated final
        const finalParts = [
            accumulatedFinalRef.current,
            sessionFinalRef.current
        ].filter(p => Boolean(p && p.trim()));

        const committedAll = finalParts.join(' ').replace(/\s+/g, ' ').trim();
        accumulatedFinalRef.current = committedAll;
        sessionFinalRef.current = '';
        currentInterimRef.current = '';

        const fullText = [baseTextRef.current, committedAll].filter(p => Boolean(p && p.trim())).join(' ').trim();
        setTranscript(fullText);
        setInterimText('');

        if (onTranscriptChangeRef.current) {
            onTranscriptChangeRef.current(fullText);
        }

        // Finalize recognition
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {}
        }

        // Fallback: If Web Speech produced no text, but user spoke and audio was recorded, submit to Faster-Whisper
        if (!committedAll && audioChunksRef.current.length > 0) {
            const mimeType = getBestAudioMimeType() || 'audio/webm';
            const fullBlob = new Blob(audioChunksRef.current, { type: mimeType });
            if (fullBlob.size > 2000) {
                setIsConverting(true);
                api.transcribeVoice(fullBlob, 'speech.webm', 'en')
                    .then((res) => {
                        if (res && res.text) {
                            const trimmed = res.text.trim();
                            if (trimmed) {
                                accumulatedFinalRef.current = trimmed;
                                const combined = [baseTextRef.current, trimmed].filter(p => Boolean(p && p.trim())).join(' ').trim();
                                setTranscript(combined);
                                if (onTranscriptChangeRef.current) {
                                    onTranscriptChangeRef.current(combined);
                                }
                            }
                        }
                    })
                    .catch((err) => {
                        console.warn('[useVoiceInput] Faster-Whisper fallback error:', err);
                    })
                    .finally(() => {
                        setIsConverting(false);
                    });
            }
        }

        cleanupAudio();
        setIsConverting(false);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
    }, [cleanupAudio]);

    // Start listening: Live Web Speech + Concurrent Audio Level Waveform
    const startListening = useCallback(async (initialValue = '') => {
        setError('');
        cleanupAudio();

        const safeInitial = String(initialValue || '').trim();
        baseTextRef.current = safeInitial;
        accumulatedFinalRef.current = '';
        sessionFinalRef.current = '';
        currentInterimRef.current = '';

        setTranscript(safeInitial);
        setInterimText('');
        setIsListening(true);
        isListeningRef.current = true;
        shouldRestartRef.current = true;
        setIsConverting(true);

        const SpeechRecognitionClass = getSpeechRecognitionClass();

        // 1. Initialize Web Speech API for INSTANT LIVE STREAMING TRANSCRIPTION
        if (SpeechRecognitionClass) {
            try {
                setRecognitionEngine('Web Speech (Live Neural)');
                const recognition = new SpeechRecognitionClass();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.maxAlternatives = 1;
                recognition.lang = langRef.current || 'en-US';

                recognition.onstart = () => {
                    setIsListening(true);
                    isListeningRef.current = true;
                    setIsConverting(true);
                };

                recognition.onresult = (event) => {
                    let currentSessionFinal = '';
                    let currentInterim = '';

                    for (let i = 0; i < event.results.length; i++) {
                        const res = event.results[i];
                        if (res.isFinal) {
                            currentSessionFinal += res[0].transcript + ' ';
                        } else {
                            currentInterim += res[0].transcript;
                        }
                    }

                    sessionFinalRef.current = currentSessionFinal.trim();
                    currentInterimRef.current = currentInterim.trim();

                    // Compose live transcript: base + accumulated + current session final + interim
                    const parts = [
                        baseTextRef.current,
                        accumulatedFinalRef.current,
                        sessionFinalRef.current,
                        currentInterimRef.current
                    ].filter(p => Boolean(p && p.trim()));

                    const liveCombined = parts.join(' ').replace(/\s+/g, ' ').trim();

                    setInterimText(currentInterimRef.current);
                    setTranscript(liveCombined);
                    setIsConverting(true);
                    setIsSpeaking(true);

                    // Real-time word-by-word lively update
                    if (onTranscriptChangeRef.current) {
                        onTranscriptChangeRef.current(liveCombined);
                    }

                    if (convertingTimeoutRef.current) clearTimeout(convertingTimeoutRef.current);
                    convertingTimeoutRef.current = setTimeout(() => {
                        if (!isSpeakingRef.current) setIsConverting(false);
                    }, 1200);
                };

                recognition.onerror = (err) => {
                    console.warn('[useVoiceInput] Speech recognition event:', err.error);
                    if (err.error === 'not-allowed') {
                        setError('Microphone permission denied. Please allow microphone access in your browser address bar.');
                        setIsListening(false);
                        isListeningRef.current = false;
                        shouldRestartRef.current = false;
                    }
                };

                recognition.onend = () => {
                    // Crucial fix: preserve finalized words into accumulated buffer so restarts NEVER wipe text!
                    const newlyCommitted = [accumulatedFinalRef.current, sessionFinalRef.current].filter(Boolean).join(' ').trim();
                    accumulatedFinalRef.current = newlyCommitted;
                    sessionFinalRef.current = '';
                    currentInterimRef.current = '';

                    if (shouldRestartRef.current && isListeningRef.current) {
                        try {
                            recognition.start();
                        } catch (e) {}
                    }
                };

                recognitionRef.current = recognition;
                recognition.start();
            } catch (err) {
                console.warn('[useVoiceInput] Web Speech init warning:', err);
            }
        } else {
            setRecognitionEngine('Faster-Whisper (base.en)');
        }

        // 2. Concurrently open audio meter for waveform visualization and audio chunk capture
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    }
                });

                mediaStreamRef.current = stream;
                startAudioMeter(stream);

                const mimeType = getBestAudioMimeType();
                const options = mimeType ? { mimeType } : {};
                const recorder = new MediaRecorder(stream, options);
                mediaRecorderRef.current = recorder;
                audioChunksRef.current = [];

                recorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) {
                        audioChunksRef.current.push(e.data);
                    }
                };

                recorder.start(800);
            } catch (micErr) {
                console.warn('[useVoiceInput] Microphone stream warning:', micErr);
                if (!SpeechRecognitionClass) {
                    if (micErr.name === 'NotAllowedError') {
                        setError('Microphone permission denied. Please allow microphone access.');
                    } else {
                        setError(`Microphone error: ${micErr.message || 'Microphone unavailable'}`);
                    }
                    setIsListening(false);
                    isListeningRef.current = false;
                }
            }
        }
    }, [cleanupAudio, startAudioMeter]);

    // Toggle helper
    const toggleListening = useCallback((currentText = '') => {
        if (isListening) {
            stopListening();
        } else {
            startListening(currentText);
        }
    }, [isListening, startListening, stopListening]);

    // Manual setter / reset
    const resetTranscript = useCallback((newVal = '') => {
        const safeVal = String(newVal || '');
        baseTextRef.current = safeVal.trim();
        accumulatedFinalRef.current = '';
        sessionFinalRef.current = '';
        currentInterimRef.current = '';
        setTranscript(safeVal);
        setInterimText('');
        if (onTranscriptChangeRef.current) {
            onTranscriptChangeRef.current(safeVal);
        }
    }, []);

    // Simulated voice input for instant demoing / test verification
    const simulateVoiceInput = useCallback((sampleText = "I have extensive experience building scalable web applications with React, Python, and modern AI pipelines.") => {
        stopListening();
        setIsListening(true);
        isListeningRef.current = true;
        setIsConverting(true);
        setIsSpeaking(true);
        isSpeakingRef.current = true;
        setRecognitionEngine('Faster-Whisper (Live Demo)');
        setInterimText('Listening and converting spoken words into text...');

        const words = sampleText.split(' ');
        let currentIdx = 0;
        let accumulated = baseTextRef.current ? `${baseTextRef.current.trim()} ` : '';

        if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);

        simulationIntervalRef.current = setInterval(() => {
            if (currentIdx < words.length) {
                const currentWord = words[currentIdx];
                accumulated += (currentIdx === 0 && !baseTextRef.current ? '' : ' ') + currentWord;
                accumulated = accumulated.replace(/\s+/g, ' ').trim();

                setInterimText(currentWord);
                setAudioLevel(35 + Math.round(Math.random() * 45));

                const currentCombined = accumulated;
                setTranscript(currentCombined);
                if (onTranscriptChangeRef.current) {
                    onTranscriptChangeRef.current(currentCombined);
                }
                currentIdx++;
            } else {
                clearInterval(simulationIntervalRef.current);
                simulationIntervalRef.current = null;
                setInterimText('');
                setIsSpeaking(false);
                isSpeakingRef.current = false;
                setAudioLevel(0);
                setTimeout(() => {
                    setIsConverting(false);
                    setIsListening(false);
                    isListeningRef.current = false;
                }, 800);
            }
        }, 150);
    }, [stopListening]);

    // Unmount cleanup
    useEffect(() => {
        return () => {
            isListeningRef.current = false;
            shouldRestartRef.current = false;
            cleanupAudio();
        };
    }, [cleanupAudio]);

    return {
        isListening,
        isConverting,
        isSpeaking,
        transcript,
        interimText,
        audioLevel,
        error,
        isSupported,
        recognitionEngine,
        engineStatus,
        startListening,
        stopListening,
        toggleListening,
        resetTranscript,
        simulateVoiceInput,
        setTranscript: resetTranscript,
    };
}

export default useVoiceInput;
