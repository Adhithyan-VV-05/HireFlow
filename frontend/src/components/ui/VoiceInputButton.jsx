import React from 'react';
import { Mic, MicOff, Square } from 'lucide-react';

/**
 * VoiceInputButton
 * Reusable microphone button with reactive live audio level animation.
 * Props:
 * - isListening: boolean
 * - audioLevel: number (0-100)
 * - isSupported: boolean
 * - onClick: () => void
 * - size: 'sm' | 'md' | 'lg'
 * - title: string
 * - disabled: boolean
 * - showWaveform: boolean
 */
export default function VoiceInputButton({
    isListening = false,
    audioLevel = 0,
    isSupported = true,
    onClick,
    size = 'md',
    title,
    disabled = false,
    showWaveform = false,
    className = '',
}) {
    if (!isSupported) {
        return (
            <button
                type="button"
                className={`voice-btn voice-btn-${size} voice-btn-unsupported ${className}`}
                title="Voice input is not supported in this browser. Please use Chrome or Edge."
                disabled
            >
                <MicOff className="voice-btn-icon text-gray-400" />
            </button>
        );
    }

    const defaultTitle = isListening
        ? '🎙️ Listening & transcribing live speech... Click to stop'
        : '🎙️ Click to speak — lively real-time speech-to-text';

    // Scale audio level for dynamic visual feedback (clamps 0.95 to 1.35)
    const scaleFactor = isListening ? 1 + (audioLevel / 100) * 0.35 : 1;

    return (
        <div className={`voice-input-wrapper ${isListening ? 'active' : ''}`}>
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                title={title || defaultTitle}
                className={`voice-btn voice-btn-${size} ${isListening ? 'listening' : ''} ${className}`}
                style={{
                    transform: isListening ? `scale(${scaleFactor})` : undefined,
                    transition: 'transform 0.08s ease, background 0.2s ease, box-shadow 0.2s ease',
                }}
            >
                {isListening ? (
                    <Square className="voice-btn-icon voice-icon-stop" />
                ) : (
                    <Mic className="voice-btn-icon voice-icon-mic" />
                )}
                {isListening && <span className="voice-pulse-ring" />}
            </button>

            {/* Optional mini real-time soundwave next to button */}
            {showWaveform && isListening && (
                <div className="voice-live-meter" title={`Microphone volume: ${audioLevel}%`}>
                    {[1, 2, 3, 4].map(idx => {
                        const barHeight = Math.max(4, Math.min(22, (audioLevel * (0.6 + idx * 0.15))));
                        return (
                            <span
                                key={idx}
                                className="voice-meter-bar"
                                style={{ height: `${barHeight}px` }}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
