import React, { useState } from 'react';
import { api } from '../api/client';

/**
 * InterviewReportModal
 * Recruiter modal displaying comprehensive candidate interview simulation report,
 * full question-by-question transcripts, AI evaluation rubrics, and direct ATS stage controls.
 */
export default function InterviewReportModal({ reportData, isOpen, onClose, onStatusUpdated }) {
    if (!isOpen || !reportData) return null;

    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(reportData.candidate_status || 'Interview Completed');
    const [statusNote, setStatusNote] = useState('');
    const [statusSuccess, setStatusSuccess] = useState('');

    const summary = reportData.summary_report || {};
    const transcript = reportData.transcript || [];

    const handleUpdateStatus = async () => {
        if (!reportData.candidate_id) return;
        setUpdatingStatus(true);
        setStatusSuccess('');
        try {
            await api.updateAtsCandidateStatus(reportData.candidate_id, {
                status: selectedStatus,
                notes: statusNote || `Status updated from interview evaluation report`,
                job_id: reportData.job_id
            });
            setStatusSuccess(`Status successfully updated to '${selectedStatus}'!`);
            if (onStatusUpdated) onStatusUpdated(reportData.candidate_id, selectedStatus);
        } catch (err) {
            alert(err.message || 'Failed to update candidate status');
        } finally {
            setUpdatingStatus(false);
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
                maxWidth: '900px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: '#0d0d16',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '20px',
                padding: '2rem',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingBottom: '1.5rem',
                    marginBottom: '1.75rem'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.6rem', color: 'white', fontWeight: 800 }}>
                                {reportData.candidate_name || 'Candidate Evaluation'}
                            </h2>
                            <span className="hub-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontSize: '0.75rem' }}>
                                AI Simulation Report
                            </span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--gray-400)', fontSize: '0.9rem' }}>
                            Role: <strong style={{ color: 'var(--accent-400)' }}>{reportData.job_title}</strong> • Completed: {reportData.completed_at ? new Date(reportData.completed_at).toLocaleString() : 'Recent'}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="close-btn"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            color: 'white',
                            fontSize: '1.2rem',
                            cursor: 'pointer'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Score Summary Metrics */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1rem',
                    marginBottom: '1.75rem'
                }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '1.25rem', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--gray-400)', fontWeight: 700 }}>
                            🎯 Overall Assessment Score
                        </div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#10b981', marginTop: '0.2rem' }}>
                            {reportData.overall_score || summary.overall_score || 0}%
                        </div>
                    </div>
                    <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '1.25rem', borderRadius: '14px', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--gray-400)', fontWeight: 700 }}>
                            ⚡ Technical Accuracy
                        </div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#818cf8', marginTop: '0.2rem' }}>
                            {reportData.technical_score || summary.technical_score || 0}%
                        </div>
                    </div>
                    <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '1.25rem', borderRadius: '14px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--gray-400)', fontWeight: 700 }}>
                            🤝 Behavioral & Clarity
                        </div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fbbf24', marginTop: '0.2rem' }}>
                            {reportData.behavioral_score || summary.behavioral_score || 0}%
                        </div>
                    </div>
                </div>

                {/* Recommendation & Insights */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    marginBottom: '1.75rem'
                }}>
                    <h4 style={{ margin: 0, marginBottom: '0.5rem', color: 'white', fontSize: '0.95rem', fontWeight: 800 }}>
                        📋 AI Evaluation Summary & Recommendation:
                    </h4>
                    <p style={{ margin: 0, color: '#ccc', fontSize: '0.9rem', lineHeight: '1.6' }}>
                        {summary.recommendation_notes || "Candidate completed all scheduled interview simulation questions."}
                    </p>
                </div>

                {/* Strengths & Growth Areas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '1rem' }}>
                        <h4 style={{ margin: 0, marginBottom: '0.65rem', color: '#34d399', fontSize: '0.9rem', fontWeight: 700 }}>
                            ✅ Verified Strengths
                        </h4>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--gray-300)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                            {(summary.strengths || []).map((s, i) => (
                                <li key={i}>{s}</li>
                            ))}
                        </ul>
                    </div>
                    <div style={{ background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '12px', padding: '1rem' }}>
                        <h4 style={{ margin: 0, marginBottom: '0.65rem', color: '#fbbf24', fontSize: '0.9rem', fontWeight: 700 }}>
                            💡 Growth Recommendations
                        </h4>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--gray-300)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                            {(summary.areas_to_improve || []).map((s, i) => (
                                <li key={i}>{s}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Per-Question Detailed Transcript */}
                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.15rem', color: 'white', fontWeight: 800, marginBottom: '1rem' }}>
                        📝 Question-by-Question Transcript & Evaluation
                    </h3>

                    {transcript.length === 0 ? (
                        <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>No individual answer responses recorded.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {transcript.map((item, idx) => (
                                <div key={idx} style={{
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '14px',
                                    padding: '1.25rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Question {idx + 1} ({item.question_type || 'technical'})
                                            </span>
                                            <h4 style={{ margin: '0.3rem 0', fontSize: '1rem', color: 'white' }}>
                                                {item.question}
                                            </h4>
                                        </div>
                                        <div style={{
                                            background: item.score >= 8 ? 'rgba(16, 185, 129, 0.15)' : item.score >= 6 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                            color: item.score >= 8 ? '#10b981' : item.score >= 6 ? '#818cf8' : '#fbbf24',
                                            fontWeight: 800,
                                            padding: '0.3rem 0.75rem',
                                            borderRadius: '8px',
                                            fontSize: '0.9rem'
                                        }}>
                                            Score: {item.score}/10
                                        </div>
                                    </div>

                                    {/* MCQ Options Display if available */}
                                    {item.options && Object.keys(item.options).length > 0 ? (
                                        <div style={{ marginBottom: '0.85rem' }}>
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                                gap: '0.5rem',
                                                marginBottom: '0.75rem'
                                            }}>
                                                {Object.entries(item.options).map(([optKey, optVal]) => {
                                                    const isChosen = item.candidate_answer === optKey;
                                                    const isCorrect = item.correct_option === optKey;

                                                    let borderColor = 'rgba(255, 255, 255, 0.08)';
                                                    let bgColor = 'rgba(255, 255, 255, 0.02)';
                                                    let pillBg = 'rgba(255, 255, 255, 0.1)';

                                                    if (isCorrect) {
                                                        borderColor = 'rgba(16, 185, 129, 0.5)';
                                                        bgColor = 'rgba(16, 185, 129, 0.08)';
                                                        pillBg = '#10b981';
                                                    } else if (isChosen && !isCorrect) {
                                                        borderColor = 'rgba(244, 63, 94, 0.5)';
                                                        bgColor = 'rgba(244, 63, 94, 0.08)';
                                                        pillBg = '#fb7185';
                                                    }

                                                    return (
                                                        <div key={optKey} style={{
                                                            border: `1px solid ${borderColor}`,
                                                            background: bgColor,
                                                            borderRadius: '8px',
                                                            padding: '0.6rem 0.8rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.6rem',
                                                            fontSize: '0.85rem'
                                                        }}>
                                                            <span style={{
                                                                width: '22px',
                                                                height: '22px',
                                                                borderRadius: '6px',
                                                                background: pillBg,
                                                                color: 'white',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontWeight: 800,
                                                                fontSize: '0.75rem',
                                                                flexShrink: 0
                                                            }}>
                                                                {optKey}
                                                            </span>
                                                            <span style={{ color: isCorrect ? '#34d399' : isChosen ? '#fda4af' : '#cbd5e1', lineHeight: '1.4' }}>
                                                                {optVal}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Candidate Choice and Result Tag */}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1.25rem',
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                                borderRadius: '8px',
                                                padding: '0.6rem 0.85rem',
                                                fontSize: '0.85rem'
                                            }}>
                                                <span>
                                                    Candidate Answer: <strong style={{
                                                        color: item.candidate_answer === item.correct_option ? '#10b981' : '#fb7185'
                                                    }}>
                                                        Option {item.candidate_answer || 'None'}
                                                    </strong>
                                                </span>
                                                <span>
                                                    Correct Key: <strong style={{ color: '#10b981' }}>Option {item.correct_option}</strong>
                                                </span>
                                                <span style={{
                                                    marginLeft: 'auto',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 800,
                                                    padding: '0.2rem 0.5rem',
                                                    borderRadius: '4px',
                                                    background: item.candidate_answer === item.correct_option ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                                                    color: item.candidate_answer === item.correct_option ? '#10b981' : '#fb7185'
                                                }}>
                                                    {item.candidate_answer === item.correct_option ? '✓ CORRECT' : '✕ INCORRECT'}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Fallback for legacy free-text responses */
                                        <div style={{
                                            background: 'rgba(0, 0, 0, 0.3)',
                                            border: '1px solid rgba(255, 255, 255, 0.05)',
                                            borderRadius: '10px',
                                            padding: '0.85rem',
                                            marginBottom: '0.85rem'
                                        }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                                                Candidate Answer:
                                            </div>
                                            <p style={{ margin: 0, color: '#ddd', fontSize: '0.88rem', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                                                {item.candidate_answer || 'No answer provided.'}
                                            </p>
                                        </div>
                                    )}

                                    {/* AI Evaluation / Explanation */}
                                    {(item.explanation || (item.evaluation && item.evaluation.feedback)) && (
                                        <div style={{
                                            background: 'rgba(99, 102, 241, 0.04)',
                                            border: '1px solid rgba(99, 102, 241, 0.18)',
                                            borderRadius: '10px',
                                            padding: '0.85rem'
                                        }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--primary-400)', fontWeight: 700, marginBottom: '0.3rem' }}>
                                                ✦ Explanation & Rubric Analysis:
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                                                {item.explanation || item.evaluation?.feedback}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ATS Action Panel */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    padding: '1.5rem'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'white', fontWeight: 800, marginBottom: '0.5rem' }}>
                        ⚡ Take ATS Hiring Action
                    </h3>
                    <p style={{ margin: 0, color: 'var(--gray-400)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                        Advance or update candidate stage directly in the ATS pipeline based on this simulation performance.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '1rem', alignItems: 'center' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-400)', marginBottom: '0.3rem' }}>
                                Candidate Stage
                            </label>
                            <select
                                className="form-input"
                                value={selectedStatus}
                                onChange={e => setSelectedStatus(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.4)' }}
                            >
                                <option value="Applied">Applied</option>
                                <option value="Screening">Screening</option>
                                <option value="Shortlisted">Shortlisted</option>
                                <option value="Interview Scheduled">Interview Scheduled</option>
                                <option value="Interview In Progress">Interview In Progress</option>
                                <option value="Interview Completed">Interview Completed</option>
                                <option value="Selected">Selected (Offer)</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-400)', marginBottom: '0.3rem' }}>
                                Recruiter Decision Notes
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. Strong system design acumen, recommending for executive round..."
                                value={statusNote}
                                onChange={e => setStatusNote(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.4)' }}
                            />
                        </div>

                        <div>
                            <button
                                onClick={handleUpdateStatus}
                                disabled={updatingStatus}
                                className="hub-btn hub-btn-primary"
                                style={{ marginTop: '1.2rem', padding: '0.6rem 1.5rem', whiteSpace: 'nowrap' }}
                            >
                                {updatingStatus ? 'Updating...' : 'Update Stage'}
                            </button>
                        </div>
                    </div>

                    {statusSuccess && (
                        <div style={{ color: '#10b981', fontSize: '0.85rem', marginTop: '0.85rem', fontWeight: 600 }}>
                            ✓ {statusSuccess}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
