import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { Mic, MicOff, Sparkles, Volume2 } from 'lucide-react';

export default function VideoInterview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [interview, setInterview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [callStarted, setCallStarted] = useState(false);
    const [muted, setMuted] = useState(false);
    const [cameraOff, setCameraOff] = useState(false);
    const [speechHistory, setSpeechHistory] = useState([]);

    // Real-time SpeechRecognition / webkitSpeechRecognition hook
    const {
        isListening,
        isConverting,
        isSpeaking,
        transcript,
        interimText,
        audioLevel,
        isSupported: voiceSupported,
        recognitionEngine,
        error: voiceError,
        startListening,
        stopListening,
        simulateVoiceInput
    } = useVoiceInput({
        onTranscriptChange: (text) => {
            if (text && text.trim()) {
                setSpeechHistory(prev => {
                    const last = prev[prev.length - 1];
                    if (last && Date.now() - last.timestamp < 4000) {
                        return [...prev.slice(0, -1), { text: text.trim(), timestamp: Date.now() }];
                    }
                    return [...prev.slice(-10), { text: text.trim(), timestamp: Date.now() }];
                });
            }
        }
    });

    useEffect(() => {
        loadInterviewDetails();
    }, [id]);

    const loadInterviewDetails = async () => {
        try {
            const scheduled = await api.getScheduledInterviews();
            const found = scheduled.find(iv => iv.id === id);
            if (found) {
                setInterview(found);
            } else {
                alert("Interview not found or not scheduled for video call.");
                navigate('/');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Synchronize SpeechRecognition with call state and mute toggle
    useEffect(() => {
        if (callStarted && !muted) {
            startListening('');
        } else {
            stopListening();
        }
    }, [callStarted, muted, startListening, stopListening]);

    const handleToggleMute = () => {
        setMuted(prev => !prev);
    };

    const handleJoinMeeting = () => {
        setCallStarted(true);
    };

    if (loading) {
        return (
            <div className="auth-page">
                <div className="loading-state">
                    <div className="spinner" />
                    <p>Connecting to secure meeting server...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="video-interview-page" style={{ height: '100vh', background: '#0a0a0c', color: 'white', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#121214', borderBottom: '1px solid #222' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: '#6366f1', height: 40, width: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>HF</div>
                    <div>
                        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Video Interview: {interview?.candidate_name}</h2>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>
                            Secure Encrypted Connection • {recognitionEngine !== 'none' ? `${recognitionEngine} Live` : 'SpeechRecognition'} • {id}
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {isListening && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.3rem 0.75rem', borderRadius: 20 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} className="animate-ping" />
                            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>
                                {recognitionEngine} Active ({audioLevel}%)
                            </span>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{ background: '#ef4444', height: 10, width: 10, borderRadius: '50%' }}></div>
                        <span style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: 600 }}>LIVE</span>
                    </div>
                </div>
            </header>

            {/* Stage */}
            <main style={{ flex: 1, position: 'relative', display: 'flex', padding: '1.5rem', gap: '1.5rem', overflow: 'hidden' }}>

                {/* Main Video (Interviewer Mockup + Speech HUD) */}
                <div style={{ flex: 2, background: '#1a1a1e', borderRadius: 24, position: 'relative', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid #333' }}>
                    {!callStarted ? (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', zIndex: 10 }}>
                            <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', marginBottom: '1.5rem', border: '4px solid #475569' }}>
                                👤
                            </div>
                            <h3>Waiting for interviewer to join...</h3>
                            <p style={{ color: '#888', marginBottom: '2rem' }}>Scheduled time: {new Date(interview?.scheduled_at).toLocaleString()}</p>
                            <button
                                onClick={handleJoinMeeting}
                                className="action-btn primary-btn"
                                style={{ padding: '1rem 3rem', fontSize: '1.1rem', borderRadius: 50, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
                            >
                                Join Meeting & Start Speech Recognition
                            </button>
                        </div>
                    ) : (
                        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
                            {/* Mock Interviewer Video */}
                            <div style={{ height: '100%', width: '100%', background: 'linear-gradient(45deg, #1e1b4b 0%, #312e81 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', margin: '0 auto 1rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                                        🤖
                                    </div>
                                    <h3 style={{ margin: 0 }}>AI Interviewer (Virtual Presence)</h3>
                                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                                        Analyzing facial expressions, eye contact, and oral clarity...
                                    </p>
                                </div>
                            </div>

                            {/* Self View (Small overlay) */}
                            <div style={{ position: 'absolute', top: 20, right: 20, width: 220, height: 140, background: '#000', borderRadius: 16, border: '2px solid #6366f1', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 5 }}>
                                {cameraOff ? (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
                                        <span style={{ fontSize: '0.85rem' }}>📷 Camera Off</span>
                                    </div>
                                ) : (
                                    <div style={{ height: '100%', background: '#2d333b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '2rem' }}>👤</span>
                                        <span style={{ position: 'absolute', bottom: 8, left: 8, fontSize: '0.7rem', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 4 }}>
                                            You {muted ? '(Muted)' : '(Mic On)'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Live Closed Captions / SpeechRecognition HUD */}
                            <div style={{
                                position: 'absolute',
                                bottom: 20,
                                left: 20,
                                right: 20,
                                background: 'rgba(15, 23, 42, 0.88)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(99, 102, 241, 0.35)',
                                borderRadius: 16,
                                padding: '0.85rem 1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '1rem',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        background: muted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                        color: muted ? '#f87171' : '#10b981',
                                        border: muted ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                                        borderRadius: 20,
                                        padding: '0.25rem 0.65rem',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {muted ? '🔇 Muted' : isConverting ? '⚡ Transcribing...' : '🎙️ Live Speech'}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{
                                            margin: 0,
                                            fontSize: '0.92rem',
                                            color: muted ? '#94a3b8' : '#f8fafc',
                                            fontWeight: 500,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {muted
                                                ? 'Microphone is muted. Click mic below to speak.'
                                                : (interimText ? `"${interimText}"` : (transcript ? transcript : 'Speak into your microphone — speech recognition transcribes in real-time...'))}
                                        </p>
                                    </div>
                                </div>

                                {/* Dynamic Mini Audio Level Waveform */}
                                {!muted && isListening && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }} title={`Microphone volume: ${audioLevel}%`}>
                                        {[1, 2, 3, 4, 5].map(i => {
                                            const h = Math.max(4, Math.min(22, (audioLevel * (0.3 + i * 0.15))));
                                            return (
                                                <div
                                                    key={i}
                                                    style={{
                                                        width: 3,
                                                        height: `${h}px`,
                                                        background: audioLevel > 15 ? '#10b981' : '#6366f1',
                                                        borderRadius: 2,
                                                        transition: 'height 0.08s ease'
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar (Details/Real-time Metrics + Live Transcript Feed) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '320px', maxWidth: '380px' }}>
                    <div className="card glass-card" style={{ flex: 1, overflowY: 'auto', background: '#121214', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                            <h4 style={{ margin: 0, color: '#6366f1', fontSize: '1rem' }}>Real-time Analysis</h4>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                Engine: {recognitionEngine}
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem 1rem', borderRadius: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                                    <span>Professionalism Score</span>
                                    <span style={{ color: '#10b981', fontWeight: 700 }}>92%</span>
                                </div>
                                <div style={{ height: 6, background: '#222', borderRadius: 3 }}>
                                    <div style={{ height: '100%', width: '92%', background: '#10b981', borderRadius: 3 }}></div>
                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem 1rem', borderRadius: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                                    <span>Confidence & Oral Clarity</span>
                                    <span style={{ color: isSpeaking ? '#10b981' : '#fbbf24', fontWeight: 700 }}>
                                        {isSpeaking ? '94% (Speaking)' : '85% (Listening)'}
                                    </span>
                                </div>
                                <div style={{ height: 6, background: '#222', borderRadius: 3 }}>
                                    <div style={{ height: '100%', width: isSpeaking ? '94%' : '85%', background: isSpeaking ? '#10b981' : '#fbbf24', borderRadius: 3 }}></div>
                                </div>
                            </div>

                            {/* Live Transcript Stream */}
                            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.85rem 1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>📝 Live Transcript Stream</span>
                                    <span style={{ fontSize: '0.7rem', color: '#a5b4fc' }}>
                                        {transcript ? `${transcript.trim().split(/\s+/).filter(Boolean).length} words` : '0 words'}
                                    </span>
                                </div>
                                <div style={{ maxHeight: '140px', overflowY: 'auto', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                                    {transcript ? (
                                        <p style={{ margin: 0, fontStyle: isConverting ? 'italic' : 'normal' }}>
                                            "{transcript}"
                                        </p>
                                    ) : (
                                        <p style={{ margin: 0, color: '#64748b', fontStyle: 'italic' }}>
                                            Spoken words will be transcribed here via Web Speech Recognition in real time.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Test Speech Button for demo */}
                            <button
                                type="button"
                                onClick={() => simulateVoiceInput("I have extensive experience leading frontend and AI architecture for enterprise software platforms.")}
                                style={{
                                    background: 'rgba(99, 102, 241, 0.15)',
                                    border: '1px solid rgba(99, 102, 241, 0.35)',
                                    color: '#a5b4fc',
                                    borderRadius: 8,
                                    padding: '0.5rem 0.75rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem'
                                }}
                            >
                                <Sparkles size={13} /> Test Speech Recognition Output
                            </button>

                            <div style={{ marginTop: 'auto', padding: '0.85rem 1rem', background: '#6366f120', borderRadius: 12, border: '1px solid #6366f140' }}>
                                <p style={{ fontSize: '0.8rem', margin: 0, color: '#a5b4fc', lineHeight: '1.4' }}>
                                    💡 <strong>Pro-Tip:</strong> Maintain eye contact with the camera and speak clearly for best SpeechRecognition accuracy.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Controls */}
            <footer style={{ padding: '1.25rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.25rem', background: '#0a0a0c', borderTop: '1px solid #1a1a1a' }}>
                <button
                    onClick={handleToggleMute}
                    style={{
                        height: 54,
                        width: 54,
                        borderRadius: '50%',
                        border: 'none',
                        background: muted ? '#ef4444' : isListening ? '#10b981' : '#27272a',
                        transition: 'all 0.2s',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isListening ? '0 0 20px rgba(16, 185, 129, 0.4)' : 'none'
                    }}
                    title={muted ? 'Unmute microphone (activate SpeechRecognition)' : 'Mute microphone'}
                >
                    {muted ? <MicOff size={22} color="white" /> : <Mic size={22} color="white" />}
                </button>

                <button
                    onClick={() => setCameraOff(!cameraOff)}
                    style={{ height: 54, width: 54, borderRadius: '50%', border: 'none', background: cameraOff ? '#ef4444' : '#27272a', transition: 'all 0.2s', fontSize: '1.2rem', cursor: 'pointer' }}
                    title={cameraOff ? "Turn on camera" : "Turn off camera"}
                >
                    {cameraOff ? '🚫' : '📷'}
                </button>

                <button
                    onClick={() => navigate('/')}
                    style={{ height: 54, padding: '0 2rem', borderRadius: 27, border: 'none', background: '#ef4444', fontWeight: 'bold', transition: 'all 0.2s', cursor: 'pointer', color: 'white', fontSize: '0.95rem' }}
                >
                    End Call
                </button>
            </footer>

            {/* Global styles for this page */}
            <style>{`
                .video-interview-page h3, .video-interview-page h2 { margin-bottom: 0.5rem; }
                .video-interview-page p { margin: 0; color: #888; }
            `}</style>
        </div>
    );
}
