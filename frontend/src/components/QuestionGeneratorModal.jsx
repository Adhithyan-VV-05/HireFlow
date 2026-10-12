import React, { useState } from 'react';
import { api } from '../api/client';
import { useVoiceInput } from '../hooks/useVoiceInput';
import VoiceInputButton from './ui/VoiceInputButton';

/**
 * QuestionGeneratorModal
 * Interactive question builder for recruiters to dynamically configure,
 * preview, and schedule role-specific questions for any position.
 */
export default function QuestionGeneratorModal({
    isOpen,
    onClose,
    defaultRole = 'Senior ML Engineer',
    jobId = null,
    candidateId = null,
    candidateName = 'Candidate',
    onStartSimulation
}) {
    if (!isOpen) return null;

    const [roleTitle, setRoleTitle] = useState(defaultRole);
    const [questionType, setQuestionType] = useState('mixed');
    const [difficulty, setDifficulty] = useState('Intermediate');
    const [technicalCount, setTechnicalCount] = useState(3);
    const [behavioralCount, setBehavioralCount] = useState(1);
    const [situationalCount, setSituationalCount] = useState(1);
    const [hrCount, setHrCount] = useState(0);
    const [resumeBasedCount, setResumeBasedCount] = useState(0);
    const [recruiterConditions, setRecruiterConditions] = useState('');

    // SpeechRecognition hook for voice dictation of custom conditions
    const {
        isListening: isConditionVoiceListening,
        audioLevel: conditionAudioLevel,
        isSupported: voiceSupported,
        recognitionEngine,
        toggleListening: toggleConditionVoice,
        resetTranscript: resetConditionTranscript
    } = useVoiceInput({
        onTranscriptChange: (text) => setRecruiterConditions(text)
    });

    const totalQuestions = (parseInt(technicalCount) || 0) +
        (parseInt(behavioralCount) || 0) +
        (parseInt(situationalCount) || 0) +
        (parseInt(hrCount) || 0) +
        (parseInt(resumeBasedCount) || 0);

    const [generating, setGenerating] = useState(false);
    const [scheduling, setScheduling] = useState(false);
    const [generatedResult, setGeneratedResult] = useState(null);
    const [scheduledSuccess, setScheduledSuccess] = useState(null);
    const [error, setError] = useState('');

    const popularRoles = [
        'Senior ML Engineer',
        'Machine Learning Engineer',
        'Data Scientist',
        'Data Analyst',
        'Software Engineer',
        'Full Stack Developer',
        'Backend Developer',
        'Frontend Developer',
        'AI Engineer',
        'DevOps Engineer'
    ];

    const handleGenerate = async () => {
        if (!roleTitle.trim()) {
            setError('Please enter or select a job role title.');
            return;
        }

        setGenerating(true);
        setError('');
        setGeneratedResult(null);
        setScheduledSuccess(null);

        try {
            const data = await api.generateQuestions({
                job_id: jobId,
                job_title: roleTitle.trim(),
                candidate_id: candidateId,
                question_type: questionType,
                experience_level: difficulty,
                num_questions: totalQuestions > 0 ? totalQuestions : 5,
                technical_count: parseInt(technicalCount) || 0,
                behavioral_count: parseInt(behavioralCount) || 0,
                situational_count: parseInt(situationalCount) || 0,
                hr_count: parseInt(hrCount) || 0,
                resume_based_count: parseInt(resumeBasedCount) || 0,
                recruiter_conditions: recruiterConditions.trim() || undefined
            });
            setGeneratedResult(data);
        } catch (err) {
            setError(err.message || 'Failed to generate interview questions.');
        } finally {
            setGenerating(false);
        }
    };

    const handleScheduleForCandidate = async () => {
        if (!candidateId || !jobId) {
            setError('Please associate this interview with a specific candidate and job before scheduling.');
            return;
        }

        setScheduling(true);
        setError('');
        try {
            const data = await api.startSimulation({
                candidate_id: candidateId,
                job_id: jobId,
                interview_type: questionType,
                num_questions: totalQuestions > 0 ? totalQuestions : 5,
                technical_count: parseInt(technicalCount) || 0,
                behavioral_count: parseInt(behavioralCount) || 0,
                situational_count: parseInt(situationalCount) || 0,
                hr_count: parseInt(hrCount) || 0,
                resume_based_count: parseInt(resumeBasedCount) || 0,
                initial_status: 'scheduled',
                recruiter_conditions: recruiterConditions.trim() || undefined
            });
            setScheduledSuccess(data);
        } catch (err) {
            setError(err.message || 'Failed to schedule interview for candidate.');
        } finally {
            setScheduling(false);
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
                maxWidth: '850px',
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
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem'
                        }}>
                            ✨
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'white', fontWeight: 800 }}>
                                    AI MCQ Interview Question Builder
                                </h2>
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    color: '#34d399',
                                    border: '1px solid rgba(16, 185, 129, 0.35)',
                                    padding: '0.15rem 0.55rem',
                                    borderRadius: '999px',
                                    letterSpacing: '0.04em'
                                }}>
                                    MCQ Only (No Descriptive)
                                </span>
                            </div>
                            <p style={{ margin: 0, color: 'var(--gray-400)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                                Generates rigorous Multiple Choice Questions (A, B, C, D) strictly conditioned on recruiter specifications via AI API.
                            </p>
                        </div>
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

                {/* Configuration Controls */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    marginBottom: '1.5rem'
                }}>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label className="form-label" style={{ fontSize: '0.85rem', color: 'var(--gray-300)' }}>
                            Target Job Role:
                        </label>
                        <input
                            type="text"
                            className="form-input"
                            value={roleTitle}
                            onChange={e => setRoleTitle(e.target.value)}
                            placeholder="e.g. Senior ML Engineer, Data Scientist, DevOps Engineer..."
                            style={{ background: 'rgba(0, 0, 0, 0.4)', marginBottom: '0.75rem' }}
                        />

                        {/* Quick Role Badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {popularRoles.map(role => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => setRoleTitle(role)}
                                    style={{
                                        fontSize: '0.75rem',
                                        padding: '0.25rem 0.6rem',
                                        borderRadius: '999px',
                                        background: roleTitle === role ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.04)',
                                        border: `1px solid ${roleTitle === role ? '#6366f1' : 'rgba(255, 255, 255, 0.08)'}`,
                                        color: roleTitle === role ? '#c7d2fe' : 'var(--gray-300)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category Breakdown & Counts */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '0.75rem',
                        marginBottom: '1rem',
                        padding: '1rem',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--gray-400)', display: 'block', marginBottom: '0.2rem' }}>
                                Technical Count:
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                value={technicalCount}
                                onChange={e => setTechnicalCount(e.target.value)}
                                className="form-input"
                                style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--gray-400)', display: 'block', marginBottom: '0.2rem' }}>
                                Behavioral Count:
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="5"
                                value={behavioralCount}
                                onChange={e => setBehavioralCount(e.target.value)}
                                className="form-input"
                                style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--gray-400)', display: 'block', marginBottom: '0.2rem' }}>
                                Situational Count:
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="5"
                                value={situationalCount}
                                onChange={e => setSituationalCount(e.target.value)}
                                className="form-input"
                                style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--gray-400)', display: 'block', marginBottom: '0.2rem' }}>
                                HR / Culture Count:
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="5"
                                value={hrCount}
                                onChange={e => setHrCount(e.target.value)}
                                className="form-input"
                                style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--gray-400)', display: 'block', marginBottom: '0.2rem' }}>
                                Total Questions:
                            </label>
                            <div style={{
                                padding: '0.4rem 0.6rem',
                                background: 'rgba(99, 102, 241, 0.2)',
                                border: '1px solid #6366f1',
                                borderRadius: '6px',
                                textAlign: 'center',
                                fontWeight: 800,
                                color: '#c7d2fe',
                                fontSize: '0.95rem'
                            }}>
                                {totalQuestions}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="form-label" style={{ fontSize: '0.82rem', color: 'var(--gray-300)' }}>
                                Focus Mode:
                            </label>
                            <select
                                className="form-select"
                                value={questionType}
                                onChange={e => setQuestionType(e.target.value)}
                                style={{ background: 'rgba(0, 0, 0, 0.4)' }}
                            >
                                <option value="mixed">Mixed (Comprehensive Evaluation)</option>
                                <option value="technical">Technical In-Depth Only</option>
                                <option value="behavioral">Behavioral & Leadership</option>
                                <option value="situational">Situational Scenarios</option>
                                <option value="resume-based">Resume Grounded</option>
                            </select>
                        </div>

                        <div>
                            <label className="form-label" style={{ fontSize: '0.82rem', color: 'var(--gray-300)' }}>
                                Target Seniority / Difficulty:
                            </label>
                            <select
                                className="form-select"
                                value={difficulty}
                                onChange={e => setDifficulty(e.target.value)}
                                style={{ background: 'rgba(0, 0, 0, 0.4)' }}
                            >
                                <option value="Entry">Entry Level</option>
                                <option value="Intermediate">Intermediate / Mid-Level</option>
                                <option value="Senior">Senior / Staff</option>
                                <option value="Lead">Lead / Principal</option>
                            </select>
                        </div>
                    </div>

                    {/* Recruiter Custom Conditions & Directives Input */}
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <label className="form-label" style={{ fontSize: '0.82rem', color: 'var(--gray-300)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>🎯 Recruiter Conditions & Directives:</span>
                                {isConditionVoiceListening && (
                                    <span style={{ fontSize: '0.72rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                                        ● {recognitionEngine} Dictating...
                                    </span>
                                )}
                            </label>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <VoiceInputButton
                                    isListening={isConditionVoiceListening}
                                    audioLevel={conditionAudioLevel}
                                    isSupported={voiceSupported}
                                    onClick={() => toggleConditionVoice(recruiterConditions)}
                                    size="sm"
                                    showWaveform={true}
                                    title={isConditionVoiceListening ? "Stop voice dictation" : "Click to speak recruiter conditions with microphone"}
                                />
                                <span style={{ color: '#38bdf8', fontSize: '0.72rem', fontWeight: 700 }}>
                                    Speech & Text AI
                                </span>
                            </div>
                        </div>

                        <textarea
                            rows={2}
                            value={recruiterConditions}
                            onChange={e => {
                                setRecruiterConditions(e.target.value);
                                resetConditionTranscript(e.target.value);
                            }}
                            placeholder={isConditionVoiceListening ? "Listening... Speak conditions aloud (e.g., 'Focus on distributed Kubernetes microservices and low-latency cache invalidation')..." : "Type or click the microphone to speak conditions (e.g. 'Must test Kubernetes pod lifecycle and Kafka partition rebalancing')..."}
                            className="form-input"
                            style={{
                                width: '100%',
                                background: isConditionVoiceListening ? 'rgba(99, 102, 241, 0.08)' : 'rgba(0, 0, 0, 0.4)',
                                border: isConditionVoiceListening ? '1.5px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '0.6rem 0.8rem',
                                fontSize: '0.85rem',
                                resize: 'vertical',
                                borderRadius: '8px',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Actions Row */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={handleGenerate}
                            disabled={generating || scheduling}
                            className="btn btn-primary"
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {generating ? (
                                <>
                                    <span className="spinner-sm"></span>
                                    <span>Generating MCQs via AI API...</span>
                                </>
                            ) : (
                                <span>Preview Question Set (MCQ Format)</span>
                            )}
                        </button>

                        {candidateId && jobId && (
                            <button
                                onClick={handleScheduleForCandidate}
                                disabled={generating || scheduling}
                                className="btn btn-secondary"
                                style={{
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.75rem 1.25rem',
                                    fontWeight: 700
                                }}
                            >
                                {scheduling ? 'Scheduling...' : '📅 Schedule & Save for Candidate'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div style={{
                        padding: '0.85rem 1.2rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '10px',
                        color: '#fca5a5',
                        fontSize: '0.88rem',
                        marginBottom: '1.5rem'
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* Scheduled Success Banner */}
                {scheduledSuccess && (
                    <div style={{
                        padding: '1.25rem',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        borderRadius: '12px',
                        color: '#34d399',
                        fontSize: '0.9rem',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.3rem' }}>
                            ✓ Interview Successfully Scheduled!
                        </div>
                        <p style={{ margin: 0, color: 'var(--gray-300)', fontSize: '0.85rem' }}>
                            The complete question set ({scheduledSuccess.question_count} questions) has been pre-generated and stored in the database.
                            The candidate (<strong>{scheduledSuccess.candidate_name}</strong>) can now view and start this interview from their Candidate Portal.
                            ATS status updated to <em>Interview Scheduled</em>.
                        </p>
                    </div>
                )}

                {/* Generated Question Preview */}
                {generatedResult && (
                    <div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem'
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>
                                    Generated Questions ({generatedResult.questions?.length || 0})
                                </h3>
                                <span style={{
                                    fontSize: '0.72rem',
                                    color: 'var(--gray-400)',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '4px'
                                }}>
                                    Provider: {generatedResult.generated_by}
                                </span>
                            </div>

                            {onStartSimulation && candidateId && jobId && (
                                <button
                                    onClick={() => onStartSimulation(jobId, roleTitle)}
                                    className="btn btn-primary"
                                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                >
                                    Start Live Simulation Now ➔
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            {generatedResult.questions?.map((q, idx) => (
                                <div key={idx} style={{
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    borderRadius: '12px',
                                    padding: '1rem 1.25rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <span style={{
                                                fontSize: '0.72rem',
                                                fontWeight: 800,
                                                background: '#6366f1',
                                                color: 'white',
                                                padding: '0.1rem 0.45rem',
                                                borderRadius: '4px'
                                            }}>
                                                Q{q.number || idx + 1}
                                            </span>
                                            <span style={{
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                color: '#a855f7',
                                                textTransform: 'uppercase'
                                            }}>
                                                {q.type}
                                            </span>
                                            <span style={{
                                                fontSize: '0.72rem',
                                                color: 'var(--gray-400)'
                                            }}>
                                                • {q.difficulty}
                                            </span>
                                        </div>

                                        <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600 }}>
                                            {q.skill || q.skills?.[0] || 'Technical Skill'}
                                        </span>
                                    </div>

                                    <p style={{ margin: '0.4rem 0 0.6rem 0', color: 'white', fontSize: '0.92rem', lineHeight: '1.5' }}>
                                        {q.question}
                                    </p>

                                    {/* MCQ Options Display */}
                                    {q.options && typeof q.options === 'object' && (
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                            gap: '0.5rem',
                                            marginTop: '0.75rem',
                                            marginBottom: '0.75rem'
                                        }}>
                                            {Object.entries(q.options).map(([optKey, optText]) => {
                                                const isCorrect = q.correct_option === optKey;
                                                return (
                                                    <div
                                                        key={optKey}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'flex-start',
                                                            gap: '0.6rem',
                                                            padding: '0.6rem 0.85rem',
                                                            borderRadius: '8px',
                                                            background: isCorrect ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                                            border: isCorrect ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)'
                                                        }}
                                                    >
                                                        <span style={{
                                                            fontWeight: 800,
                                                            fontSize: '0.8rem',
                                                            color: isCorrect ? '#34d399' : '#a5b4fc',
                                                            background: isCorrect ? 'rgba(16, 185, 129, 0.25)' : 'rgba(99, 102, 241, 0.15)',
                                                            padding: '0.15rem 0.45rem',
                                                            borderRadius: '4px',
                                                            minWidth: '20px',
                                                            textAlign: 'center'
                                                        }}>
                                                            {optKey}
                                                        </span>
                                                        <span style={{ fontSize: '0.85rem', color: isCorrect ? '#ecfdf5' : '#e2e8f0', lineHeight: '1.4' }}>
                                                            {optText}
                                                            {isCorrect && (
                                                                <strong style={{ color: '#10b981', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                                                                    ✓ (Correct Key)
                                                                </strong>
                                                            )}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Explanation */}
                                    {q.explanation && (
                                        <div style={{
                                            background: 'rgba(99, 102, 241, 0.06)',
                                            borderLeft: '3px solid #6366f1',
                                            padding: '0.5rem 0.75rem',
                                            borderRadius: '0 6px 6px 0',
                                            fontSize: '0.82rem',
                                            color: '#cbd5e1',
                                            marginTop: '0.5rem',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <strong style={{ color: '#818cf8' }}>✦ Answer Key & Explanation: </strong>
                                            {q.explanation}
                                        </div>
                                    )}

                                    {/* Expected Focus Badges */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                                        {(q.expected_topics || q.expected_focus || []).map((topic, tIdx) => (
                                            <span key={tIdx} style={{
                                                fontSize: '0.7rem',
                                                padding: '0.15rem 0.5rem',
                                                borderRadius: '999px',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                color: 'var(--gray-300)'
                                            }}>
                                                🎯 {topic}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
