import React from 'react';
import { Sparkles, Loader2, Volume2, CheckCircle2 } from 'lucide-react';

/**
 * VoiceConvertingIndicator
 * Highly visible, lively real-time audio-to-text converting and loading animation.
 * Clearly communicates that speech is actively being listened to, processed, and transcribed into the answer field.
 */
export default function VoiceConvertingIndicator({
    isListening = false,
    isConverting = false,
    isSpeaking = false,
    audioLevel = 0,
    interimText = '',
    targetLabel = 'Candidate Answer',
    compact = false
}) {
    if (!isListening) return null;

    // Status message determination
    let statusText = 'Listening for audio stream...';
    let statusBadge = 'Mic Active';
    let badgeColor = 'rgba(99, 102, 241, 0.25)';
    let textColor = '#818cf8';

    if (interimText) {
        statusText = 'Converting spoken words to text in real-time...';
        statusBadge = 'Live Converting';
        badgeColor = 'rgba(16, 185, 129, 0.25)';
        textColor = '#10b981';
    } else if (isSpeaking || audioLevel > 8) {
        statusText = 'Speech detected — transcribing audio into text...';
        statusBadge = 'Speech Detected';
        badgeColor = 'rgba(239, 68, 68, 0.25)';
        textColor = '#f87171';
    } else if (isConverting) {
        statusText = 'Processing audio stream & synchronizing text...';
        statusBadge = 'Converting Audio';
        badgeColor = 'rgba(245, 158, 11, 0.25)';
        textColor = '#fbbf24';
    }

    if (compact) {
        return (
            <div className="voice-converting-compact" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.15), rgba(16, 185, 129, 0.15))',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                marginBottom: '0.5rem',
                fontSize: '0.8rem',
                color: '#e2e8f0',
                gap: '0.75rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="voice-dot-ping" style={{ backgroundColor: '#10b981' }} />
                    <span style={{ fontWeight: 600 }}>{statusText}</span>
                    {interimText && (
                        <span style={{ color: '#38bdf8', fontStyle: 'italic', fontWeight: 700 }}>
                            "{interimText}"
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>➔ {targetLabel}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="voice-converting-banner" style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.96) 100%)',
            border: '1.5px solid rgba(99, 102, 241, 0.45)',
            borderRadius: '14px',
            padding: '1rem 1.25rem',
            marginBottom: '0.9rem',
            boxShadow: '0 6px 24px rgba(99, 102, 241, 0.22)'
        }}>
            <div className="voice-converting-top" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '0.75rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span className="voice-live-badge" style={{
                        background: badgeColor,
                        color: textColor,
                        padding: '0.3rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        border: `1px solid ${textColor}40`
                    }}>
                        <span className="voice-dot-ping" style={{ backgroundColor: textColor }} />
                        {statusBadge}
                    </span>

                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {isConverting && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
                        {statusText}
                    </span>
                </div>

                {/* Animated Equalizer Waveform reacting directly to microphone volume */}
                <div className="voice-equalizer-stream" title={`Live Mic Volume: ${audioLevel}%`} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    height: '32px',
                    padding: '0 10px',
                    background: 'rgba(0, 0, 0, 0.45)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.12)'
                }}>
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400 mr-1" />
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => {
                        const factor = 0.3 + ((i * 4) % 8) * 0.12;
                        // Always keep a small gentle pulse so it never looks dead
                        const basePulse = Math.sin(Date.now() / 200 + i) * 3 + 6;
                        const height = Math.max(5, Math.min(28, Math.round(audioLevel > 5 ? audioLevel * factor + 5 : basePulse)));
                        const isHot = audioLevel > 14;
                        return (
                            <span
                                key={i}
                                className="voice-eq-bar"
                                style={{
                                    width: '3.5px',
                                    height: `${height}px`,
                                    borderRadius: '2px',
                                    backgroundColor: isHot ? '#ef4444' : (audioLevel > 6 ? '#10b981' : '#818cf8'),
                                    transition: 'height 0.08s ease, background-color 0.15s ease'
                                }}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Real-time streaming interim preview */}
            <div className="voice-live-preview-box" style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '10px',
                padding: '0.85rem 1rem'
            }}>
                <div className="voice-preview-header" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.4rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', fontWeight: 700, color: '#818cf8' }}>
                        <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                        Live Audio Transcription Stream ➔ Transcribing into {targetLabel}:
                    </span>

                    {isConverting ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#34d399', fontWeight: 800 }}>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Converting speech lively...
                        </span>
                    ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Mic Standby
                        </span>
                    )}
                </div>

                <div className="voice-preview-content" style={{ minHeight: '26px' }}>
                    {interimText ? (
                        <p style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600, color: '#38bdf8', fontStyle: 'italic', lineHeight: 1.5 }}>
                            "{interimText}" <span className="voice-typing-cursor">|</span>
                        </p>
                    ) : (
                        <p style={{ margin: 0, fontSize: '0.825rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            🎙️ Speak naturally — your spoken words are converted and placed into the answer box below in real time...
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
