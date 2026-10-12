import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

/**
 * CandidateStatusHistoryModal
 * Modal displaying the chronological ATS lifecycle history and status transitions of a candidate.
 */
export default function CandidateStatusHistoryModal({ candidateId, candidateName, isOpen, onClose }) {
    if (!isOpen || !candidateId) return null;

    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchHistory();
    }, [candidateId]);

    const fetchHistory = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getAtsCandidateHistory(candidateId);
            setHistory(data.history || []);
        } catch (err) {
            setError(err.message || 'Failed to load candidate status history.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Applied': return '#6366f1';
            case 'Screening': return '#8b5cf6';
            case 'Shortlisted': return '#3b82f6';
            case 'Interview Scheduled': return '#f59e0b';
            case 'Interview In Progress': return '#ec4899';
            case 'Interview Completed': return '#10b981';
            case 'Selected': return '#059669';
            case 'Rejected': return '#f43f5e';
            default: return 'var(--gray-400)';
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
        }}>
            <div className="modal-content glass-card card" style={{
                maxWidth: '650px',
                width: '100%',
                maxHeight: '85vh',
                overflowY: 'auto',
                background: '#0d0d16',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '20px',
                padding: '2rem',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingBottom: '1.25rem',
                    marginBottom: '1.5rem'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'white', fontWeight: 800 }}>
                            📈 ATS Lifecycle History
                        </h2>
                        <p style={{ margin: 0, color: 'var(--gray-400)', fontSize: '0.85rem' }}>
                            Candidate: <strong style={{ color: 'white' }}>{candidateName || 'Candidate'}</strong>
                        </p>
                    </div>

                    <button onClick={onClose} className="close-btn" style={{
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

                {loading && (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                        <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
                        <p style={{ marginTop: '1rem', color: 'var(--gray-400)', fontSize: '0.9rem' }}>
                            Fetching timeline records...
                        </p>
                    </div>
                )}

                {error && (
                    <div style={{
                        background: 'rgba(244, 63, 94, 0.1)',
                        border: '1px solid rgba(244, 63, 94, 0.3)',
                        color: '#fb7185',
                        padding: '0.85rem',
                        borderRadius: '10px',
                        marginBottom: '1.25rem',
                        fontSize: '0.85rem'
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                {!loading && !error && history.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '2rem' }}>
                        No status transitions recorded yet for this candidate.
                    </p>
                )}

                {!loading && history.length > 0 && (
                    <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
                        {/* Timeline vertical bar */}
                        <div style={{
                            position: 'absolute',
                            left: '6px',
                            top: '10px',
                            bottom: '10px',
                            width: '2px',
                            background: 'rgba(255, 255, 255, 0.1)'
                        }} />

                        {history.map((item, idx) => (
                            <div key={item.id || idx} style={{
                                position: 'relative',
                                marginBottom: '1.5rem',
                                paddingLeft: '1.25rem'
                            }}>
                                {/* Dot indicator */}
                                <div style={{
                                    position: 'absolute',
                                    left: '-1.45rem',
                                    top: '4px',
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: getStatusColor(item.to_status),
                                    boxShadow: `0 0 8px ${getStatusColor(item.to_status)}`
                                }} />

                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    borderRadius: '12px',
                                    padding: '1rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {item.from_status && (
                                                <>
                                                    <span style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>{item.from_status}</span>
                                                    <span style={{ color: 'var(--gray-600)' }}>➔</span>
                                                </>
                                            )}
                                            <span style={{
                                                color: getStatusColor(item.to_status),
                                                fontWeight: 800,
                                                fontSize: '0.92rem'
                                            }}>
                                                {item.to_status}
                                            </span>
                                        </div>

                                        <span style={{ color: 'var(--gray-500)', fontSize: '0.75rem' }}>
                                            {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                                        </span>
                                    </div>

                                    <p style={{ margin: '0.2rem 0', color: 'var(--gray-300)', fontSize: '0.85rem' }}>
                                        {item.notes || 'Status transition logged.'}
                                    </p>

                                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.35rem' }}>
                                        Action by: <strong style={{ color: 'var(--gray-400)' }}>{item.changed_by || 'System'}</strong>
                                        {item.job_title && <span> • Role: <strong>{item.job_title}</strong></span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
