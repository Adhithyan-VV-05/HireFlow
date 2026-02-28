import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function VideoInterview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [interview, setInterview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [callStarted, setCallStarted] = useState(false);
    const [muted, setMuted] = useState(false);
    const [cameraOff, setCameraOff] = useState(false);

    useEffect(() => {
        loadInterviewDetails();
    }, [id]);

    const loadInterviewDetails = async () => {
        try {
            // We'll reuse getResult but filter for scheduled ones in a real app
            // For now, we fetch from the scheduled endpoint to find this specific one
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
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>Secure Encrypted Connection • {id}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ background: '#ef4444', height: 10, width: 10, borderRadius: '50%', alignSelf: 'center' }}></div>
                    <span style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: 600 }}>LIVE</span>
                </div>
            </header>

            {/* Stage */}
            <main style={{ flex: 1, position: 'relative', display: 'flex', padding: '1.5rem', gap: '1.5rem', overflow: 'hidden' }}>

                {/* Main Video (Interviewer Mockup) */}
                <div style={{ flex: 2, background: '#1a1a1e', borderRadius: 24, position: 'relative', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid #333' }}>
                    {!callStarted ? (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', zIndex: 10 }}>
                            <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', marginBottom: '1.5rem', border: '4px solid #475569' }}>
                                👤
                            </div>
                            <h3>Waiting for interviewer to join...</h3>
                            <p style={{ color: '#888', marginBottom: '2rem' }}>Scheduled time: {new Date(interview?.scheduled_at).toLocaleString()}</p>
                            <button
                                onClick={() => setCallStarted(true)}
                                className="action-btn primary-btn"
                                style={{ padding: '1rem 3rem', fontSize: '1.1rem', borderRadius: 50, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
                            >
                                Join Meeting Now
                            </button>
                        </div>
                    ) : (
                        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
                            {/* Mock Interviewer Video - Using a placeholder or gradient for now */}
                            <div style={{ height: '100%', width: '100%', background: 'linear-gradient(45deg, #1e1b4b 0%, #312e81 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', margin: '0 auto 1rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                                        🤖
                                    </div>
                                    <h3 style={{ margin: 0 }}>AI Interviewer (Virtual Presence)</h3>
                                    <p style={{ color: 'rgba(255,255,255,0.6)' }}>Analyzing facial expressions and sentiment...</p>
                                </div>
                            </div>

                            {/* Self View (Small overlay) */}
                            <div style={{ position: 'absolute', bottom: 20, right: 20, width: 240, height: 160, background: '#000', borderRadius: 16, border: '2px solid #6366f1', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                                {cameraOff ? (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
                                        <span>📷 Camera Off</span>
                                    </div>
                                ) : (
                                    <div style={{ height: '100%', background: '#2d333b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '2rem' }}>👤</span>
                                        <span style={{ position: 'absolute', bottom: 8, left: 8, fontSize: '0.7rem', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 4 }}>You</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar (Details/Chat/Real-time Metrics) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card glass-card" style={{ flex: 1, overflowY: 'auto', background: '#121214' }}>
                        <h4 style={{ borderBottom: '1px solid #333', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#6366f1' }}>Real-time Analysis</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                                    <span>Professionalism Score</span>
                                    <span style={{ color: '#10b981' }}>92%</span>
                                </div>
                                <div style={{ height: 6, background: '#222', borderRadius: 3 }}>
                                    <div style={{ height: '100%', width: '92%', background: '#10b981', borderRadius: 3 }}></div>
                                </div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                                    <span>Confidence Metrics</span>
                                    <span style={{ color: '#fbbf24' }}>85%</span>
                                </div>
                                <div style={{ height: 6, background: '#222', borderRadius: 3 }}>
                                    <div style={{ height: '100%', width: '85%', background: '#fbbf24', borderRadius: 3 }}></div>
                                </div>
                            </div>

                            <div style={{ marginTop: 'auto', padding: '1rem', background: '#6366f120', borderRadius: 12, border: '1px solid #6366f140' }}>
                                <p style={{ fontSize: '0.85rem', margin: 0, color: '#a5b4fc' }}>
                                    💡 <strong>Pro-Tip:</strong> Maintain eye contact with the camera and speak clearly for best results.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Controls */}
            <footer style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', background: '#0a0a0c' }}>
                <button
                    onClick={() => setMuted(!muted)}
                    style={{ height: 56, width: 56, borderRadius: '50%', border: 'none', background: muted ? '#ef4444' : '#27272a', transition: 'all 0.2s', fontSize: '1.2rem', cursor: 'pointer' }}>
                    {muted ? '🔇' : '🎤'}
                </button>
                <button
                    onClick={() => setCameraOff(!cameraOff)}
                    style={{ height: 56, width: 56, borderRadius: '50%', border: 'none', background: cameraOff ? '#ef4444' : '#27272a', transition: 'all 0.2s', fontSize: '1.2rem', cursor: 'pointer' }}>
                    {cameraOff ? '🚫' : '📷'}
                </button>
                <button
                    onClick={() => navigate('/')}
                    style={{ height: 56, padding: '0 2rem', borderRadius: 28, border: 'none', background: '#ef4444', fontWeight: 'bold', transition: 'all 0.2s', cursor: 'pointer' }}>
                    End Call
                </button>
                <button style={{ height: 56, width: 56, borderRadius: '50%', border: 'none', background: '#27272a', transition: 'all 0.2s', fontSize: '1.2rem', cursor: 'pointer' }}>
                    💬
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
