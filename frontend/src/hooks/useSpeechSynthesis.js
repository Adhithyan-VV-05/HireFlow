import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useSpeechSynthesis
 *
 * Robust, production-grade Text-to-Speech (TTS) hook for HireFlow AI.
 * Reads AI interview questions and candidate feedback aloud with natural cadence.
 *
 * Solves standard browser/Chrome TTS issues:
 * 1. Chrome audio engine pause after cancel (auto calls speechSynthesis.resume()).
 * 2. V8 garbage-collection of active SpeechSynthesisUtterance (stores global window anchor).
 * 3. Asynchronous voice loading via onvoiceschanged event.
 * 4. Articulate voice selection preferring natural English voices.
 */
export function useSpeechSynthesis() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [voices, setVoices] = useState([]);

    const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
    const utteranceRef = useRef(null);

    // Initialize and load available browser voices
    useEffect(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            setIsSupported(false);
            return;
        }

        setIsSupported(true);
        synthRef.current = window.speechSynthesis;

        const updateVoices = () => {
            try {
                const available = window.speechSynthesis.getVoices() || [];
                if (available.length > 0) {
                    setVoices(available);
                }
            } catch (e) {}
        };

        updateVoices();

        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = updateVoices;
        }

        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
    }, []);

    // Stop / Cancel active speech cleanly
    const cancel = useCallback(() => {
        if (synthRef.current) {
            try {
                synthRef.current.cancel();
            } catch (e) {}
        }
        if (typeof window !== 'undefined') {
            window.__currentSpeechUtterance = null;
        }
        setIsSpeaking(false);
    }, []);

    // Speak text aloud with natural voice
    const speak = useCallback((text, {
        rate = 0.96,
        pitch = 1.0,
        lang = 'en-US',
        onStart = null,
        onEnd = null,
        onError = null
    } = {}) => {
        if (!synthRef.current || isMuted) return;

        const cleanText = String(text || '').trim();
        if (!cleanText) return;

        try {
            // Cancel any prior utterance
            synthRef.current.cancel();

            // Crucial Chrome fix: resume speech synthesis engine if paused
            if (synthRef.current.paused) {
                synthRef.current.resume();
            }

            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.rate = rate;
            utterance.pitch = pitch;
            utterance.lang = lang;

            // Anchor to window object to prevent Chromium V8 garbage collector from cutting off audio
            if (typeof window !== 'undefined') {
                window.__currentSpeechUtterance = utterance;
            }
            utteranceRef.current = utterance;

            utterance.onstart = () => {
                setIsSpeaking(true);
                if (onStart) onStart();
            };

            utterance.onend = () => {
                setIsSpeaking(false);
                if (typeof window !== 'undefined') {
                    window.__currentSpeechUtterance = null;
                }
                if (onEnd) onEnd();
            };

            utterance.onerror = (e) => {
                // Ignore benign cancellation errors
                if (e.error !== 'canceled' && e.error !== 'interrupted') {
                    console.warn('[useSpeechSynthesis] Speech error:', e.error || e);
                }
                setIsSpeaking(false);
                if (typeof window !== 'undefined') {
                    window.__currentSpeechUtterance = null;
                }
                if (onError) onError(e);
            };

            // Choose natural, high-articulation English voice
            const availableVoices = voices.length > 0 ? voices : (synthRef.current.getVoices() || []);
            const preferredVoice = availableVoices.find(v =>
                v.lang.startsWith('en') &&
                (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('Zira') || v.name.includes('David'))
            ) || availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0];

            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }

            synthRef.current.speak(utterance);

            // Chrome auto-resume heartbeat (resumes if engine pauses on long sentences)
            const resumeInterval = setInterval(() => {
                if (synthRef.current && synthRef.current.speaking) {
                    if (synthRef.current.paused) {
                        synthRef.current.resume();
                    }
                } else {
                    clearInterval(resumeInterval);
                }
            }, 3000);

        } catch (err) {
            console.warn('[useSpeechSynthesis] Speech synthesis error:', err);
            setIsSpeaking(false);
        }
    }, [cancel, isMuted, voices]);

    // Mute / Unmute toggle
    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const next = !prev;
            if (next) cancel();
            return next;
        });
    }, [cancel]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cancel();
        };
    }, [cancel]);

    return {
        speak,
        cancel,
        isSpeaking,
        isMuted,
        setIsMuted,
        toggleMute,
        isSupported,
        voices
    };
}

export default useSpeechSynthesis;
