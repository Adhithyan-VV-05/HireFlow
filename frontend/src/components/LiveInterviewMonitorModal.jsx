import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';

/**
 * LiveInterviewMonitorModal
 * Real-time monitoring console for HR/recruiters to observe a candidate's
 * interview simulation progress live as questions are answered.
 */
export default function LiveInterviewMonitorModal({
    isOpen,
    onClose,
    sessionId,
    candidateName = 'Candidate',
    jobTitle = 'Target Role',
    onViewReport
}) {
    if (!isOpen || !sessionId) return null;

    const [liveData, setLiveData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const eventSourceRef = useRef(null);
    const pollingTimerRef = useRef(null);

    useEffect(() => {
        fetchStatus();

        // 1. Establish Server-Sent Events (SSE) Stream
        const token = localStorage.getItem('token');
        const sseUrl = `/api/interviews/simulation/${sessionId}/stream`;

        try {
            const es = new EventSource(sseUrl);
            eventSourceRef.current = es;

            es.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data && data.session_id) {
                        setLiveData(data);
                        setLoading(false);
                    }
                } catch (e) {
                    console.debug('[LiveMonitor] Heartbeat or unparsed message');
                }
            };

            es.onerror = () => {
                // If SSE disconnects, fallback seamlessly to smart polling
                es.close();
            };
        } catch (e) {
            console.debug('[LiveMonitor] SSE not available, using smart polling fallback');
        }

        // 2. High-Frequency Polling Fallback (every 2.5s) to guarantee updates
        pollingTimerRef.current = setInterval(() => {
            fetchStatus();
        }, 2500);

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (pollingTimerRef.current) {
                clearInterval(pollingTimerRef.current);
            }
        };
    }, [sessionId]);

    const fetchStatus = async () => {
        try {
            const data = await api.getLiveStatus(sessionId);
            setLiveData(data);
            setError('');
        } catch (err) {
            console.warn('[LiveMonitor] Status fetch warning:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const isCompleted = liveData?.interview_status === 'completed';
    const answered = liveData?.answered_count || 0;
    const total = liveData?.total_questions || 1;
    const progressPercent = Math.min(100, Math.round((answered / total) * 100));

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1.5rem'
        }}>
            <div className="modal-content glass-card card" style={{
                maxWidth: '850px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: '#0c0d18',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '24px',
                padding: '2rem',
                boxShadow: '0 30px 80px rgba(0, 0, 0, 0.8)'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingBottom: '1.25rem',
                    marginBottom: '1.5rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: isCompleted 
                                ? 'linear-gradient(135deg, #10b981, #059669)'
                                : 'linear-gradient(135deg, #f59e0b, #d97706)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.3rem',
                            boxShadow: isCompleted ? '0 0 20px rgba(16, 185, 129, 0.4)' : '0 0 20px rgba(245, 158, 11, 0.4)'
                        }}>
                            {isCompleted ? '✓' : '⚡'}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'white', fontWeight: 800 }}>
                                    Live Interview Monitoring
                                </h2>
                                <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '999px',
                                    background: isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                    color: isCompleted ? '#34d399' : '#fbbf24',
                                    border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem'
                                }}>
                                    <span style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: isCompleted ? '#34d399' : '#fbbf24',
                                        animation: isCompleted ? 'none' : 'pulse 1.5s infinite'
                                    }}></span>
                                    {isCompleted ? 'Completed' : 'Live / In Progress'}
                                </span>
                            </div>
                            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--gray-400)', fontSize: '0.82rem' }}>
                                Candidate: <strong style={{ color: 'white' }}>{liveData?.candidate_name || candidateName}</strong> • Role: <strong style={{ color: 'var(--primary)' }}>{liveData?.job_title || jobTitle}</strong>
                            </p>
                        </div>
                    </div>

                    <button onClick={onClose} style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        color: 'white',
                        fontSize: '1.2rem',
                        cursor: 'pointer'
                    }}>
                        ✕
                    </button>
                </div>

                {loading && !liveData ? (
                    <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
                        <p className="muted-text">Connecting to real-time interview telemetry stream...</p>
                    </div>
                ) : (
                    <>
                        {/* Live Telemetry Progress Bar */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '16px',
                            padding: '1.5rem',
                            marginBottom: '1.5rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Current Progress
                                    </span>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>
                                        {liveData?.progress || `${answered} / ${total}`}
                                        <span style={{ fontSize: '0.9rem', color: 'var(--gray-400)', fontWeight: 500, marginLeft: '0.5rem' }}>
                                            questions answered
                                        </span>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Remaining
                                    </span>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#93c5fd' }}>
                                        {liveData?.remaining_count ?? (total - answered)}
                                        <span style={{ fontSize: '0.9rem', color: 'var(--gray-400)', fontWeight: 500, marginLeft: '0.5rem' }}>
                                            left
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Progress bar track */}
                            <div style={{
                                width: '100%',
                                height: '10px',
                                background: 'rgba(255, 255, 255, 0.08)',
                                borderRadius: '999px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${progressPercent}%`,
                                    height: '100%',
                                    background: isCompleted
                                        ? 'linear-gradient(90deg, #10b981, #059669)'
                                        : 'linear-gradient(90deg, #6366f1, #a855f7)',
                                    borderRadius: '999px',
                                    transition: 'width 0.5s ease-out'
                                }}></div>
                            </div>

                            {/* Status message */}
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.75rem 1rem',
                                background: 'rgba(99, 102, 241, 0.08)',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                fontSize: '0.88rem',
                                color: '#c7d2fe'
                            }}>
                                <span style={{ fontSize: '1.1rem' }}>📢</span>
                                <span>{liveData?.current_status || 'Candidate is actively attending the interview simulation.'}</span>
                            </div>
                        </div>

                        {/* Recent Completed Answers Timeline */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: 'var(--gray-300)', fontWeight: 700 }}>
                                Completed Questions Stream ({liveData?.recent_answers?.length || 0})
                            </h4>

                            {(!liveData?.recent_answers || liveData.recent_answers.length === 0) ? (
                                <div style={{
                                    padding: '2rem',
                                    textAlign: 'center',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    borderRadius: '12px',
                                    border: '1px dashed rgba(255, 255, 255, 0.08)'
                                }}>
                                    <p style={{ margin: 0, color: 'var(--gray-400)', fontSize: '0.88rem' }}>
                                        Candidate has not submitted an answer yet. Telemetry will update live as questions are completed.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {liveData.recent_answers.map((ans, idx) => (
                                        <div key={idx} style={{
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid rgba(255, 255, 255, 0.06)',
                                            borderRadius: '12px',
                                            padding: '1rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div style={{ maxWidth: '80%' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                                                    <span style={{
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        background: 'rgba(255, 255, 255, 0.08)',
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: '6px',
                                                        color: 'var(--gray-300)'
                                                    }}>
                                                        Q{ans.question_index + 1} • {ans.question_type || 'technical'}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                                                        {ans.submitted_at ? new Date(ans.submitted_at).toLocaleTimeString() : 'Just now'}
                                                    </span>
                                                </div>
                                                <p style={{ margin: 0, fontSize: '0.88rem', color: 'white', fontWeight: 500 }}>
                                                    {ans.question}
                                                </p>
                                            </div>

                                            <div style={{
                                                textAlign: 'center',
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: '8px',
                                                background: ans.score >= 7.5 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                border: `1px solid ${ans.score >= 7.5 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                                            }}>
                                                <div style={{
                                                    fontSize: '1.1rem',
                                                    fontWeight: 800,
                                                    color: ans.score >= 7.5 ? '#34d399' : '#fbbf24'
                                                }}>
                                                    {ans.score}/10
                                                </div>
                                                <div style={{ fontSize: '0.68rem', color: 'var(--gray-400)', textTransform: 'uppercase' }}>
                                                    Score
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Completion Footer / View Report Trigger */}
                        {isCompleted && (
                            <div style={{
                                background: 'rgba(16, 185, 129, 0.08)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                borderRadius: '16px',
                                padding: '1.25rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <h4 style={{ margin: 0, color: '#34d399', fontSize: '1rem', fontWeight: 700 }}>
                                        🎉 Candidate Interview Finished
                                    </h4>
                                    <p style={{ margin: '0.2rem 0 0 0', color: 'var(--gray-300)', fontSize: '0.85rem' }}>
                                        Final AI score calculated: <strong style={{ color: 'white' }}>{liveData?.overall_score}%</strong>. ATS status synchronized to <em>Interview Completed</em>.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        onClose();
                                        if (onViewReport) onViewReport(sessionId);
                                    }}
                                    className="btn btn-primary"
                                    style={{
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        color: 'white',
                                        fontWeight: 700,
                                        padding: '0.65rem 1.25rem'
                                    }}
                                >
                                    Open Full Report ➔
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
