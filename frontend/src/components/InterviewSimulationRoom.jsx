import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import VoiceConvertingIndicator from './ui/VoiceConvertingIndicator';
import VoiceInputButton from './ui/VoiceInputButton';
import { Mic, Sparkles, Volume2, VolumeX } from 'lucide-react';

/**
 * InterviewSimulationRoom
 * Interactive AI-powered technical and behavioral interview simulation room.
 * Candidate answers real questions one by one with live evaluation, anti-double submission,
 * timer, session persistence, and final comprehensive report summary.
 */
export default function InterviewSimulationRoom({
    sessionId: initialSessionId,
    candidateId,
    jobId,
    jobTitle,
    interviewType = 'mixed',
    numQuestions = 5,
    onClose
}) {
    const [sessionId, setSessionId] = useState(initialSessionId || null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sessionData, setSessionData] = useState(null);

    // Active Question State
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(numQuestions);
    const [selectedOption, setSelectedOption] = useState('');
    const [spokenText, setSpokenText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [lastEvaluation, setLastEvaluation] = useState(null);
    const [showEvalPreview, setShowEvalPreview] = useState(false);

    // Text to Speech for reading questions aloud
    const {
        speak,
        cancel: cancelSpeech,
        isSpeaking: isTtsSpeaking,
        isMuted: isTtsMuted,
        toggleMute: toggleTtsMute
    } = useSpeechSynthesis();

    // Voice recognition hook for speech-to-text answering (SpeechRecognition / webkitSpeechRecognition)
    const {
        isListening,
        isConverting,
        isSpeaking,
        interimText,
        audioLevel,
        isSupported: voiceSupported,
        recognitionEngine,
        error: voiceError,
        toggleListening,
        stopListening,
        resetTranscript,
        simulateVoiceInput
    } = useVoiceInput({
        onTranscriptChange: (text) => {
            setSpokenText(text);
            handleSpokenAnswer(text);
        }
    });

    const handleSpokenAnswer = (text) => {
        if (!text || !currentQuestion) return;
        const lower = text.toLowerCase();
        const opts = currentQuestion.options || {};
        const entries = Array.isArray(opts)
            ? opts.map((opt, i) => [String.fromCharCode(65 + i), opt])
            : Object.entries(opts);

        for (const [key, val] of entries) {
            const letter = key.toLowerCase();
            const optionVal = String(val).toLowerCase();
            if (
                lower.includes(`option ${letter}`) ||
                lower.includes(`choice ${letter}`) ||
                lower.trim() === letter ||
                lower.endsWith(` ${letter}`) ||
                (optionVal.length > 5 && lower.includes(optionVal.substring(0, Math.min(optionVal.length, 25))))
            ) {
                setSelectedOption(key);
                break;
            }
        }
    };

    // Final Report State
    const [isCompleted, setIsCompleted] = useState(false);
    const [finalReport, setFinalReport] = useState(null);

    // Timer State (Elapsed Seconds)
    const [secondsElapsed, setSecondsElapsed] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        timerRef.current = setInterval(() => {
            setSecondsElapsed(prev => prev + 1);
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, []);

    useEffect(() => {
        initSession();
    }, []);

    // Automatically read question aloud with natural voice when question updates
    useEffect(() => {
        if (currentQuestion?.question && !isTtsMuted) {
            const timer = setTimeout(() => {
                speak(currentQuestion.question);
            }, 350);
            return () => {
                clearTimeout(timer);
                cancelSpeech();
            };
        }
    }, [currentQuestion, isTtsMuted, speak, cancelSpeech]);

    const initSession = async () => {
        setLoading(true);
        setError('');
        try {
            if (sessionId) {
                // Ensure session is marked in_progress if previously scheduled
                await api.launchSimulation(sessionId).catch(() => {});
                // Resume existing session
                const data = await api.getCurrentQuestion(sessionId);
                if (data.status === 'completed') {
                    setIsCompleted(true);
                    setFinalReport(data.summary_report);
                } else {
                    setSessionData(data);
                    setCurrentQuestion(data.question);
                    setQuestionIndex(data.current_question_index);
                    setTotalQuestions(data.total_questions);
                }
            } else if (candidateId && jobId) {
                // Start brand new simulation session
                const data = await api.startSimulation({
                    candidate_id: candidateId,
                    job_id: jobId,
                    interview_type: interviewType,
                    num_questions: numQuestions
                });
                setSessionId(data.session_id);
                setSessionData(data);
                setCurrentQuestion(data.first_question);
                setQuestionIndex(0);
                setTotalQuestions(data.question_count);
            } else {
                setError('Missing session ID or candidate/job association.');
            }
        } catch (err) {
            setError(err.message || 'Failed to initialize interview simulation.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitAnswer = async () => {
        if (!selectedOption) {
            alert('Please select an option (A, B, C, or D) to submit your answer.');
            return;
        }

        if (submitting || !sessionId || !currentQuestion) return;

        setSubmitting(true);
        setError('');

        try {
            const result = await api.submitAnswer(sessionId, {
                question_index: questionIndex,
                answer: selectedOption
            });

            if (result.status === 'completed') {
                setIsCompleted(true);
                setFinalReport(result.summary_report);
            } else {
                // Show instant evaluation feedback and stage next question
                setLastEvaluation(result.evaluation_preview);
                setShowEvalPreview(true);

                setTimeout(() => {
                    setCurrentQuestion(result.next_question);
                    setQuestionIndex(result.current_question_index);
                    setSelectedOption('');
                    setShowEvalPreview(false);
                }, 2200);
            }
        } catch (err) {
            setError(err.message || 'Error submitting answer. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatTimer = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="interview-sim-overlay" style={{
            background: 'rgba(10, 10, 18, 0.95)',
            backdropFilter: 'blur(16px)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2rem',
            maxWidth: '920px',
            margin: '0 auto',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)'
        }}>
            {/* Top Navigation & Status Bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: '1.25rem',
                marginBottom: '1.75rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, var(--primary-600), var(--accent-600))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)'
                    }}>
                        🤖
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>
                            AI Interview Simulation
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                            Role: <strong style={{ color: 'var(--accent-400)' }}>{jobTitle || sessionData?.job_title || 'Software Role'}</strong>
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '0.4rem 0.85rem',
                        borderRadius: '10px',
                        fontSize: '0.85rem',
                        color: 'var(--gray-300)'
                    }}>
                        <span>⏱️ Session Time:</span>
                        <strong style={{ color: 'white', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                            {formatTimer(secondsElapsed)}
                        </strong>
                    </div>

                    {onClose && (
                        <button
                            onClick={onClose}
                            className="action-btn ghost-btn small-btn"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        >
                            ✕ Exit
                        </button>
                    )}
                </div>
            </div>

            {loading && (
                <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                    <span className="spinner" style={{ width: 44, height: 44, borderWidth: 3 }} />
                    <p style={{ marginTop: '1.25rem', color: 'var(--gray-400)', fontSize: '0.95rem' }}>
                        Loading AI Interview Session & Tailored Questions...
                    </p>
                </div>
            )}

            {error && (
                <div style={{
                    background: 'rgba(244, 63, 94, 0.1)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: '#fb7185',
                    padding: '1rem',
                    borderRadius: '10px',
                    marginBottom: '1.5rem',
                    fontSize: '0.9rem'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* In-Progress Interview View */}
            {!loading && !isCompleted && currentQuestion && (
                <div>
                    {/* Progress Bar & Indicators */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                            <span style={{ color: 'var(--gray-300)', fontWeight: 600 }}>
                                Question {questionIndex + 1} of {totalQuestions}
                            </span>
                            <span style={{ color: 'var(--accent-400)', fontWeight: 700 }}>
                                {Math.round(((questionIndex) / totalQuestions) * 100)}% Complete
                            </span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${((questionIndex + 1) / totalQuestions) * 100}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, var(--primary-500), var(--accent-500))',
                                transition: 'width 0.4s ease'
                            }} />
                        </div>
                    </div>

                    {/* Question Card */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        padding: '1.75rem',
                        marginBottom: '1.5rem',
                        position: 'relative'
                    }}>
                        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem' }}>
                            <span style={{
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: '#818cf8',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                fontSize: '0.75rem',
                                padding: '0.2rem 0.65rem',
                                borderRadius: '6px',
                                textTransform: 'capitalize',
                                fontWeight: 700
                            }}>
                                🎯 {currentQuestion.type || 'Technical'}
                            </span>
                            <span style={{
                                background: 'rgba(16, 185, 129, 0.12)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                fontSize: '0.75rem',
                                padding: '0.2rem 0.65rem',
                                borderRadius: '6px',
                                textTransform: 'capitalize',
                                fontWeight: 700
                            }}>
                                ⚡ {currentQuestion.difficulty || 'Intermediate'}
                            </span>
                            {currentQuestion.skill && (
                                <span style={{
                                    background: 'rgba(245, 158, 11, 0.12)',
                                    color: '#fbbf24',
                                    border: '1px solid rgba(245, 158, 11, 0.25)',
                                    fontSize: '0.75rem',
                                    padding: '0.2rem 0.65rem',
                                    borderRadius: '6px',
                                    fontWeight: 700
                                }}>
                                    📌 {currentQuestion.skill}
                                </span>
                            )}
                            <span style={{
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: '#a5b4fc',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                fontSize: '0.75rem',
                                padding: '0.2rem 0.65rem',
                                borderRadius: '6px',
                                fontWeight: 700
                            }}>
                                🎙️ {recognitionEngine}
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    if (isTtsSpeaking) {
                                        cancelSpeech();
                                    } else {
                                        speak(currentQuestion.question);
                                    }
                                }}
                                style={{
                                    marginLeft: 'auto',
                                    background: isTtsSpeaking ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                                    border: isTtsSpeaking ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(255, 255, 255, 0.12)',
                                    color: isTtsSpeaking ? '#a5b4fc' : '#e2e8f0',
                                    borderRadius: '6px',
                                    padding: '0.2rem 0.65rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    transition: 'all 0.2s ease'
                                }}
                                title={isTtsSpeaking ? "Stop reading question" : "Listen to question spoken aloud"}
                            >
                                {isTtsSpeaking ? <VolumeX size={13} className="text-amber-400" /> : <Volume2 size={13} />}
                                <span>{isTtsSpeaking ? 'Stop Reading' : 'Listen Question'}</span>
                            </button>
                        </div>

                        <h3 style={{
                            margin: 0,
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: 'white',
                            lineHeight: '1.6'
                        }}>
                            {currentQuestion.question}
                        </h3>
                    </div>

                    {/* Temporary Evaluation Transition Feedback */}
                    {showEvalPreview && lastEvaluation && (
                        <div style={{
                            background: lastEvaluation.is_correct ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                            border: `1px solid ${lastEvaluation.is_correct ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)'}`,
                            borderRadius: '14px',
                            padding: '1.25rem',
                            marginBottom: '1.5rem',
                            animation: 'fadeIn 0.3s ease'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                <span style={{
                                    color: lastEvaluation.is_correct ? '#10b981' : '#fb7185',
                                    fontWeight: 800,
                                    fontSize: '0.95rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    {lastEvaluation.is_correct ? '✓ Correct Answer!' : '✕ Incorrect Answer'} ({lastEvaluation.score}/10 pts)
                                </span>
                                <span style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>Loading next question...</span>
                            </div>
                            {lastEvaluation.correct_option && (
                                <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '0.35rem' }}>
                                    Correct Option: <strong style={{ color: '#10b981' }}>Option {lastEvaluation.correct_option}</strong>
                                </div>
                            )}
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                                {lastEvaluation.feedback || lastEvaluation.explanation}
                            </p>
                        </div>
                    )}

                    {/* MCQ Options Selection Section */}
                    {!showEvalPreview && (
                        <div>
                            {/* Voice Converting & Loading Animation Indicator */}
                            <VoiceConvertingIndicator
                                isListening={isListening}
                                isConverting={isConverting}
                                isSpeaking={isSpeaking}
                                audioLevel={audioLevel}
                                interimText={interimText}
                                targetLabel="Option Selection"
                            />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <label style={{ color: 'var(--gray-300)', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>Select the Correct Option:</span>
                                    {isListening && (
                                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                                            ● Voice Input Active
                                        </span>
                                    )}
                                </label>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <VoiceInputButton
                                        isListening={isListening}
                                        audioLevel={audioLevel}
                                        isSupported={voiceSupported}
                                        onClick={() => toggleListening('')}
                                        disabled={submitting}
                                        size="sm"
                                        showWaveform={true}
                                        title={isListening ? "Stop voice listening" : "Speak answer (e.g., 'Option B')"}
                                    />

                                    <button
                                        type="button"
                                        onClick={() => {
                                            simulateVoiceInput("I choose Option B as the correct answer");
                                            setSelectedOption('B');
                                        }}
                                        title="Simulate speech-to-text option selection"
                                        style={{
                                            background: 'rgba(99, 102, 241, 0.15)',
                                            border: '1px solid rgba(99, 102, 241, 0.3)',
                                            color: '#a5b4fc',
                                            borderRadius: '6px',
                                            padding: '0.25rem 0.55rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.35rem'
                                        }}
                                    >
                                        <Sparkles size={13} /> Test Voice Choice
                                    </button>

                                    <span style={{
                                        fontSize: '0.78rem',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '6px',
                                        background: 'rgba(99, 102, 241, 0.15)',
                                        color: '#818cf8',
                                        fontWeight: 700
                                    }}>
                                        Single Choice
                                    </span>
                                </div>
                            </div>

                            {/* Render Options A, B, C, D */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
                                {(() => {
                                    const opts = currentQuestion.options || {};
                                    const entries = Array.isArray(opts)
                                        ? opts.map((opt, i) => [String.fromCharCode(65 + i), opt])
                                        : Object.entries(opts);

                                    return entries.map(([key, text]) => {
                                        const isSelected = selectedOption === key;
                                        return (
                                            <div
                                                key={key}
                                                onClick={() => !submitting && setSelectedOption(key)}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedOption(key); }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1rem',
                                                    padding: '1rem 1.25rem',
                                                    borderRadius: '12px',
                                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                                    background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                                                    border: isSelected ? '2px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.1)',
                                                    boxShadow: isSelected ? '0 0 16px rgba(99, 102, 241, 0.25)' : 'none',
                                                    transition: 'all 0.2s ease',
                                                    userSelect: 'none'
                                                }}
                                            >
                                                {/* Selection Radio Circle */}
                                                <div style={{
                                                    width: '22px',
                                                    height: '22px',
                                                    borderRadius: '50%',
                                                    border: isSelected ? '2px solid #818cf8' : '2px solid rgba(255, 255, 255, 0.3)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    {isSelected && (
                                                        <div style={{
                                                            width: '10px',
                                                            height: '10px',
                                                            borderRadius: '50%',
                                                            background: '#818cf8'
                                                        }} />
                                                    )}
                                                </div>

                                                {/* Option Letter Pill */}
                                                <span style={{
                                                    fontWeight: 800,
                                                    fontSize: '0.9rem',
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: isSelected ? '#6366f1' : 'rgba(255, 255, 255, 0.08)',
                                                    color: 'white',
                                                    flexShrink: 0
                                                }}>
                                                    {key}
                                                </span>

                                                {/* Option Text */}
                                                <span style={{
                                                    fontSize: '0.95rem',
                                                    color: isSelected ? 'white' : '#ddd',
                                                    lineHeight: '1.5',
                                                    fontWeight: isSelected ? 600 : 400
                                                }}>
                                                    {text}
                                                </span>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                    <span style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>
                                        {selectedOption ? (
                                            <span style={{ color: '#818cf8', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <span style={{ color: '#10b981' }}>✓</span> Option {selectedOption} chosen {isListening ? '(Live Voice)' : ''}
                                            </span>
                                        ) : (
                                            'Please select an option (or speak "Option A/B/C/D") to submit'
                                        )}
                                    </span>
                                    {spokenText && isListening && (
                                        <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontStyle: 'italic', background: 'rgba(56, 189, 248, 0.1)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                                            Speech: "{spokenText}"
                                        </span>
                                    )}
                                </div>

                                <button
                                    onClick={handleSubmitAnswer}
                                    disabled={submitting || !selectedOption}
                                    className="hub-btn hub-btn-primary"
                                    style={{
                                        padding: '0.85rem 2.25rem',
                                        fontSize: '0.95rem',
                                        fontWeight: 800,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.6rem',
                                        opacity: (!selectedOption || submitting) ? 0.5 : 1,
                                        cursor: (!selectedOption || submitting) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {submitting ? (
                                        <>
                                            <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                            <span>Evaluating Answer...</span>
                                        </>
                                    ) : (
                                        <span>Submit Option & Next ➔</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Completed Interview Summary Report View */}
            {!loading && isCompleted && finalReport && (
                <div style={{ animation: 'fadeIn 0.5s ease' }}>
                    <div style={{
                        textAlign: 'center',
                        padding: '1.5rem',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(99, 102, 241, 0.1))',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '16px',
                        marginBottom: '2rem'
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'white' }}>
                            AI Interview Simulation Completed!
                        </h2>
                        <p style={{ color: 'var(--gray-300)', marginTop: '0.4rem', fontSize: '0.9rem' }}>
                            Your answers were scored and synchronized with the HireFlow ATS.
                        </p>

                        {/* Top Scores Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '1rem',
                            marginTop: '1.5rem'
                        }}>
                            <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    🎯 Overall Score
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', marginTop: '0.2rem' }}>
                                    {finalReport.overall_score || 0}%
                                </div>
                            </div>
                            <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    ⚡ Technical Score
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#818cf8', marginTop: '0.2rem' }}>
                                    {finalReport.technical_score || 0}%
                                </div>
                            </div>
                            <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    🤝 Behavioral Score
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fbbf24', marginTop: '0.2rem' }}>
                                    {finalReport.behavioral_score || 0}%
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Strengths & Growth Areas */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            borderRadius: '14px',
                            padding: '1.25rem'
                        }}>
                            <h4 style={{ margin: 0, marginBottom: '0.85rem', color: '#34d399', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>✅</span> Key Strengths Demonstrated
                            </h4>
                            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--gray-300)', fontSize: '0.88rem', lineHeight: '1.6' }}>
                                {(finalReport.strengths || []).map((s, i) => (
                                    <li key={i}>{s}</li>
                                ))}
                            </ul>
                        </div>

                        <div style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(245, 158, 11, 0.2)',
                            borderRadius: '14px',
                            padding: '1.25rem'
                        }}>
                            <h4 style={{ margin: 0, marginBottom: '0.85rem', color: '#fbbf24', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>💡</span> Actionable Growth Areas
                            </h4>
                            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--gray-300)', fontSize: '0.88rem', lineHeight: '1.6' }}>
                                {(finalReport.areas_to_improve || []).map((s, i) => (
                                    <li key={i}>{s}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Recommendation Box */}
                    {finalReport.recommendation_notes && (
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '14px',
                            padding: '1.25rem',
                            marginBottom: '2rem'
                        }}>
                            <h4 style={{ margin: 0, marginBottom: '0.5rem', color: 'white', fontSize: '0.9rem', fontWeight: 700 }}>
                                📋 Assessment Recommendation:
                            </h4>
                            <p style={{ margin: 0, color: 'var(--gray-300)', fontSize: '0.88rem', lineHeight: '1.6' }}>
                                {finalReport.recommendation_notes}
                            </p>
                        </div>
                    )}

                    {/* Question-by-Question MCQ Performance Breakdown */}
                    {finalReport.questions_summary && finalReport.questions_summary.length > 0 && (
                        <div style={{ marginBottom: '2rem' }}>
                            <h4 style={{ margin: 0, marginBottom: '1rem', color: 'white', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>📝</span> Question-by-Question Performance ({finalReport.questions_summary.filter(q => q.is_correct).length}/{finalReport.questions_summary.length} Correct)
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {finalReport.questions_summary.map((q, idx) => (
                                    <div key={idx} style={{
                                        background: 'rgba(255, 255, 255, 0.02)',
                                        border: `1px solid ${q.is_correct ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
                                        borderRadius: '12px',
                                        padding: '1.15rem'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem', gap: '1rem' }}>
                                            <div style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                                {idx + 1}. {q.question}
                                            </div>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 800,
                                                padding: '0.25rem 0.65rem',
                                                borderRadius: '6px',
                                                background: q.is_correct ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                                                color: q.is_correct ? '#10b981' : '#fb7185',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {q.is_correct ? '✓ Correct (10/10)' : '✕ Incorrect (0/10)'}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                            <span style={{ color: 'var(--gray-300)' }}>
                                                Your Choice: <strong style={{ color: q.is_correct ? '#10b981' : '#fb7185' }}>Option {q.chosen_option}</strong>
                                            </span>
                                            <span style={{ color: 'var(--gray-300)' }}>
                                                Correct Answer: <strong style={{ color: '#10b981' }}>Option {q.correct_option}</strong>
                                            </span>
                                        </div>

                                        {q.explanation && (
                                            <p style={{ margin: 0, fontSize: '0.83rem', color: '#94a3b8', lineHeight: '1.5', background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                                                💡 <strong>Explanation:</strong> {q.explanation}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button
                            onClick={onClose}
                            className="hub-btn hub-btn-primary"
                            style={{ padding: '0.85rem 2.5rem', fontSize: '1rem', fontWeight: 800 }}
                        >
                            Back to Portal Dashboard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
