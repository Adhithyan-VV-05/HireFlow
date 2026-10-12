import React from 'react';

/**
 * AtsMatchModal
 * Displays Hugging Face ATS Intelligence matching details:
 * - Powered by 0xnbk/nbk-ats-semantic-v1-en
 * - Semantic Match %, Skill Match %, Composite ATS Score
 * - Key Matching Skills & Missing / Low Evidence Skills
 * - Recruiter recommendation verdict & quick scheduling
 */
export default function AtsMatchModal({
    isOpen,
    onClose,
    candidate,
    jobTitle,
    matchData,
    onScheduleInterview
}) {
    if (!isOpen || !candidate) return null;

    const data = matchData || {};
    const compositeScore = Math.round((data.composite_match_score || 0) * 100);
    const semanticScore = Math.round((data.semantic_match_score || 0) * 100);
    const skillScore = Math.round((data.skill_match_score || 0) * 100);
    const matchingSkills = data.matching_skills || [];
    const missingSkills = data.missing_skills || [];
    const modelUsed = data.model_used || '0xnbk/nbk-ats-semantic-v1-en';

    const getScoreColor = (score) => {
        if (score >= 75) return '#10b981'; // emerald
        if (score >= 50) return '#6366f1'; // indigo
        if (score >= 35) return '#f59e0b'; // amber
        return '#f43f5e'; // rose
    };

    const getVerdict = (score) => {
        if (score >= 80) return 'Highly Recommended for Technical Interview';
        if (score >= 65) return 'Strong Candidate — Meets Core Requirements';
        if (score >= 50) return 'Moderate Match — Verify Missing Skills in Screening';
        return 'Low Alignment — Review Candidate Portfolio or Alternate Roles';
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
                maxWidth: '750px',
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
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingBottom: '1.25rem',
                    marginBottom: '1.5rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.3rem'
                        }}>
                            🧠
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Hugging Face ATS Intelligence</h2>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                                Resume ↔ Job Semantic Matching via <code style={{ color: '#f472b6' }}>{modelUsed}</code>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Candidate & Job Banner */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Candidate</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{candidate.name || 'Candidate'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{candidate.email}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Role</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-400)' }}>{jobTitle || 'Role'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>HireFlow ATS Pipeline</div>
                    </div>
                </div>

                {/* Score Meters Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1.75rem'
                }}>
                    {/* Composite Score Card */}
                    <div style={{
                        background: 'rgba(99, 102, 241, 0.08)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '14px',
                        padding: '1.25rem',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: '0.5rem' }}>
                            Overall ATS Match
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 900, color: getScoreColor(compositeScore) }}>
                            {compositeScore}%
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--gray-400)',
                            marginTop: '0.25rem'
                        }}>
                            Weighted Hybrid Index
                        </div>
                    </div>

                    {/* Semantic Match Card */}
                    <div style={{
                        background: 'rgba(236, 72, 153, 0.08)',
                        border: '1px solid rgba(236, 72, 153, 0.3)',
                        borderRadius: '14px',
                        padding: '1.25rem',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: '0.5rem' }}>
                            HF Semantic Match
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 900, color: getScoreColor(semanticScore) }}>
                            {semanticScore}%
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--gray-400)',
                            marginTop: '0.25rem'
                        }}>
                            Cosine Vector Embedding
                        </div>
                    </div>

                    {/* Keyword / Skill Match Card */}
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '14px',
                        padding: '1.25rem',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: '0.5rem' }}>
                            Skill Overlap
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 900, color: getScoreColor(skillScore) }}>
                            {skillScore}%
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--gray-400)',
                            marginTop: '0.25rem'
                        }}>
                            {matchingSkills.length} of {matchingSkills.length + missingSkills.length} Required Skills
                        </div>
                    </div>
                </div>

                {/* Verdict Box */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <span style={{ fontSize: '1.25rem' }}>🎯</span>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'uppercase' }}>Hiring Recommendation Verdict</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{getVerdict(compositeScore)}</div>
                    </div>
                </div>

                {/* Skills Analysis */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                    {/* Matching Skills */}
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.04)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: '12px',
                        padding: '1rem'
                    }}>
                        <div style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#34d399',
                            marginBottom: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}>
                            <span>✓</span> Key Matching Skills ({matchingSkills.length})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {matchingSkills.length > 0 ? (
                                matchingSkills.map((skill, i) => (
                                    <span key={i} style={{
                                        background: 'rgba(16, 185, 129, 0.15)',
                                        color: '#34d399',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600
                                    }}>
                                        ✓ {skill}
                                    </span>
                                ))
                            ) : (
                                <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>No matching required skills identified.</span>
                            )}
                        </div>
                    </div>

                    {/* Missing Skills */}
                    <div style={{
                        background: 'rgba(245, 158, 11, 0.04)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        borderRadius: '12px',
                        padding: '1rem'
                    }}>
                        <div style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#fbbf24',
                            marginBottom: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}>
                            <span>⚠️</span> Missing / Low Evidence ({missingSkills.length})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {missingSkills.length > 0 ? (
                                missingSkills.map((skill, i) => (
                                    <span key={i} style={{
                                        background: 'rgba(245, 158, 11, 0.12)',
                                        color: '#fbbf24',
                                        border: '1px solid rgba(245, 158, 11, 0.25)',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600
                                    }}>
                                        ✕ {skill}
                                    </span>
                                ))
                            ) : (
                                <span style={{ fontSize: '0.8rem', color: '#34d399' }}>All core required skills evidenced in resume.</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.75rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '1.25rem'
                }}>
                    <button
                        onClick={onClose}
                        className="action-btn ghost-btn"
                        style={{ padding: '0.6rem 1.25rem' }}
                    >
                        Close
                    </button>
                    {onScheduleInterview && (
                        <button
                            onClick={() => {
                                onClose();
                                onScheduleInterview(candidate);
                            }}
                            className="action-btn primary-btn"
                            style={{
                                padding: '0.6rem 1.25rem',
                                background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                                border: 'none',
                                fontWeight: 700
                            }}
                        >
                            ✨ Schedule AI Interview for {candidate.name?.split(' ')[0] || 'Candidate'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
