import React from 'react';
import SkillTag from './SkillTag';

export default function CandidateCard({ candidate, onStartInterview }) {
    const skills = candidate.skills || [];
    const entities = candidate.entities || {};

    return (
        <div className="profile-card">
            <div className="profile-card-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem', margin: 0 }}>
                                {candidate.name || 'Unknown Candidate'}
                            </h3>
                            {candidate.is_verified && <span className="verified-tag" title="Verified Skill Tests Done">✓ Verified</span>}
                        </div>
                        {candidate.email && (
                            <p style={{ fontSize: '0.875rem', color: 'var(--gray-400)' }}>{candidate.email}</p>
                        )}
                    </div>
                    {onStartInterview && (
                        <button className="btn btn-accent btn-sm" onClick={onStartInterview}>
                            🎙️ Interview
                        </button>
                    )}
                </div>
            </div>

            <div className="profile-card-body">
                {/* Skills */}
                <div className="profile-section">
                    <h4 className="profile-section-title">
                        <span className="confidence-dot confidence-high" />
                        Technical Skills ({skills.length})
                    </h4>
                    <div className="skill-tags">
                        {skills.slice(0, 15).map((skill, i) => (
                            <SkillTag key={i} skill={skill} variant="default" />
                        ))}
                        {skills.length > 15 && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)', padding: '0.25rem' }}>
                                +{skills.length - 15} more
                            </span>
                        )}
                    </div>
                </div>

                {/* Job Titles */}
                {entities.JOB_TITLE && entities.JOB_TITLE.length > 0 && (
                    <div className="profile-section">
                        <h4 className="profile-section-title">
                            <span className="confidence-dot confidence-medium" />
                            Job Titles
                        </h4>
                        <div className="skill-tags">
                            {entities.JOB_TITLE.map((title, i) => (
                                <SkillTag key={i} skill={title} variant="warm" />
                            ))}
                        </div>
                    </div>
                )}

                {/* Education */}
                {entities.EDUCATION && entities.EDUCATION.length > 0 && (
                    <div className="profile-section">
                        <h4 className="profile-section-title">
                            <span className="confidence-dot confidence-medium" />
                            Education
                        </h4>
                        <div className="skill-tags">
                            {entities.EDUCATION.map((edu, i) => (
                                <SkillTag key={i} skill={edu} variant="warm" />
                            ))}
                        </div>
                    </div>
                )}

                {/* Chunk Lengths */}
                {candidate.chunk_lengths && (
                    <div className="profile-section">
                        <h4 className="profile-section-title">Section Confidence</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                            {Object.entries(candidate.chunk_lengths).map(([section, length]) => {
                                const confidence = length > 200 ? 'high' : length > 50 ? 'medium' : 'low';
                                return (
                                    <div key={section} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        fontSize: '0.8rem', color: 'var(--gray-400)'
                                    }}>
                                        <span className={`confidence-dot confidence-${confidence}`} />
                                        {section.replace('_chunk', '').replace('_', ' ')}
                                        <span style={{ color: 'var(--gray-500)', marginLeft: 'auto' }}>{length} chars</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
