import React, { useState, useEffect, useRef } from 'react';
import ChatBubble from '../components/ChatBubble';
import { api } from '../api/client';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import VoiceInputButton from '../components/ui/VoiceInputButton';
import VoiceConvertingIndicator from '../components/ui/VoiceConvertingIndicator';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';

export default function InterviewView({ candidateId, jobId, onBack }) {
    const [sessionId, setSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isStarting, setIsStarting] = useState(true);
    const [status, setStatus] = useState('active');
    const [scores, setScores] = useState({});
    const [totalScore, setTotalScore] = useState(0);
    const [candidateName, setCandidateName] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [interviewResult, setInterviewResult] = useState(null);
    const messagesEndRef = useRef(null);

    // Text to Speech for AI Interviewer questions
    const {
        speak,
        cancel: cancelSpeech,
        isSpeaking: isTtsSpeaking,
        isMuted: isTtsMuted,
        toggleMute: toggleTtsMute
    } = useSpeechSynthesis();

    // Voice recognition hook via SpeechRecognition / webkitSpeechRecognition
    const {
        isListening,
        isConverting,
        isSpeaking: isUserSpeaking,
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
            setInputValue(text);
        }
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, interimText]);

    // Start interview on mount
    useEffect(() => {
        if (candidateId && jobId) {
            startInterview();
        }
    }, [candidateId, jobId]);

    const startInterview = async () => {
        setIsStarting(true);
        try {
            const data = await api.startInterview({
                candidate_id: candidateId,
                job_id: jobId,
            });
            setSessionId(data.session_id);
            setCandidateName(data.candidate_name || 'Candidate');
            setJobTitle(data.job_title || 'Position');
            setMessages([{ role: 'assistant', content: data.message }]);

            // Speak the welcoming question
            if (data.message) {
                speak(data.message);
            }
        } catch (err) {
            setMessages([{
                role: 'assistant',
                content: `Error starting interview: ${err.message}. Make sure the backend is running.`
            }]);
        } finally {
            setIsStarting(false);
        }
    };

    const sendMessage = async () => {
        if (!inputValue.trim() || !sessionId || isLoading) return;

        if (isListening) stopListening();
        cancelSpeech();

        const userMessage = inputValue.trim();
        setInputValue('');
        resetTranscript('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const data = await api.sendMessage({
                session_id: sessionId,
                user_message: userMessage,
            });
            setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
            setScores(data.scores || {});
            setTotalScore(data.total_score || 0);
            setStatus(data.status || 'active');

            // Speak AI follow-up response
            if (data.message) {
                speak(data.message);
            }

            if (data.status === 'completed') {
                fetchResult();
            }
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, there was an error processing your response. Please try again.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchResult = async () => {
        if (!sessionId) return;
        try {
            const data = await api.getResult(sessionId);
            setInterviewResult(data);
        } catch (e) { /* ignore */ }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="chat-container">
            {/* Header */}
            <div className="chat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {onBack && (
                        <button className="btn btn-secondary btn-sm" onClick={onBack}>
                            ← Back
                        </button>
                    )}
                    <div className="chat-header-info">
                        <h2>🎙️ AI Oral Interview — {candidateName}</h2>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gray-400)' }}>
                            Role: {jobTitle} • {recognitionEngine !== 'none' ? `${recognitionEngine} Active` : 'Web Speech'}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <button
                        type="button"
                        onClick={toggleTtsMute}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}
                        title={isTtsMuted ? "Unmute AI voice read-out" : "Mute AI voice read-out"}
                    >
                        {isTtsMuted ? <VolumeX size={14} className="text-rose-400" /> : <Volume2 size={14} className="text-emerald-400" />}
                        <span>{isTtsMuted ? 'TTS Muted' : 'AI Voice On'}</span>
                    </button>

                    {status === 'active' && (
                        <span style={{
                            fontSize: '0.75rem', padding: '0.25rem 0.75rem',
                            borderRadius: 'var(--radius-full)',
                            background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)',
                            color: 'var(--accent-400)', fontWeight: 700
                        }}>
                            ● Live
                        </span>
                    )}
                    {status === 'completed' && (
                        <span style={{
                            fontSize: '0.75rem', padding: '0.25rem 0.75rem',
                            borderRadius: 'var(--radius-full)',
                            background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
                            color: 'var(--primary-400)', fontWeight: 700
                        }}>
                            ✓ Completed
                        </span>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
                {isStarting && (
                    <div style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '2rem' }}>
                        <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 1rem' }} />
                        <p>Starting interview session<span className="loading-dots"></span></p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                        <ChatBubble role={msg.role} content={msg.content} />
                        {msg.role === 'assistant' && (
                            <button
                                type="button"
                                onClick={() => speak(msg.content)}
                                style={{
                                    marginTop: '-0.5rem',
                                    marginBottom: '0.75rem',
                                    marginLeft: '0.5rem',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--gray-400)',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem'
                                }}
                                title="Replay AI question audio"
                            >
                                <Volume2 size={13} /> Replay Question
                            </button>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="chat-bubble assistant" style={{ opacity: 0.6 }}>
                        <span className="loading-dots">Thinking</span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Score Summary (shown when completed) */}
            {interviewResult && (
                <div className="score-summary">
                    <h3>📊 Interview Results</h3>
                    <div className="score-grid">
                        <div className="score-item">
                            <div className="score-item-value">{interviewResult.total_score?.toFixed(1) || '0'}</div>
                            <div className="score-item-label">Total Score</div>
                        </div>
                        <div className="score-item">
                            <div className="score-item-value">{interviewResult.total_questions || 0}</div>
                            <div className="score-item-label">Questions</div>
                        </div>
                        <div className="score-item">
                            <div className="score-item-value">{interviewResult.skill_coverage_percent?.toFixed(0) || 0}%</div>
                            <div className="score-item-label">Skill Coverage</div>
                        </div>
                    </div>

                    {/* Per-question scores */}
                    {Object.entries(interviewResult.per_question_scores || {}).length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                            <h4 style={{ fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Per-Question Scores
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem' }}>
                                {Object.entries(interviewResult.per_question_scores).map(([key, score]) => (
                                    <div key={key} style={{
                                        textAlign: 'center', padding: '0.5rem',
                                        background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)',
                                        border: '1px solid rgba(99, 102, 241, 0.1)'
                                    }}>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: score >= 7 ? 'var(--accent-400)' : score >= 5 ? 'var(--warm-400)' : 'var(--rose-400)' }}>
                                            {score}/10
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>
                                            {key.replace('_', ' ')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Voice error banner if any */}
            {voiceError && (
                <div style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    margin: '0.5rem 1rem'
                }}>
                    ⚠️ {voiceError}
                </div>
            )}

            {/* Live Voice Converting & Loading Animation Indicator */}
            {isListening && (
                <div style={{ padding: '0 1rem' }}>
                    <VoiceConvertingIndicator
                        isListening={isListening}
                        isConverting={isConverting}
                        isSpeaking={isUserSpeaking}
                        audioLevel={audioLevel}
                        interimText={interimText}
                        targetLabel="Your Interview Response"
                        compact={true}
                    />
                </div>
            )}

            {/* Input & Voice Controls */}
            <div className="chat-input-area" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                    type="text"
                    className="chat-input"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        resetTranscript(e.target.value);
                    }}
                    onKeyDown={handleKeyPress}
                    placeholder={
                        status === 'completed'
                            ? 'Interview completed'
                            : isListening
                            ? 'Listening... Speak your answer now (or type)...'
                            : 'Type or speak your answer with microphone...'
                    }
                    disabled={isLoading || status === 'completed' || !sessionId}
                    style={{ flex: 1 }}
                />

                {/* SpeechRecognition / webkitSpeechRecognition Microphone Button */}
                <VoiceInputButton
                    isListening={isListening}
                    audioLevel={audioLevel}
                    isSupported={voiceSupported}
                    onClick={() => toggleListening(inputValue)}
                    disabled={isLoading || status === 'completed' || !sessionId}
                    size="md"
                    showWaveform={true}
                    title={isListening ? "Stop voice listening" : "Click to speak your answer with microphone"}
                />

                {/* Simulation button for quick test without mic */}
                <button
                    type="button"
                    onClick={() => simulateVoiceInput("I have built distributed systems with microservices, Redis caching, and automated testing pipelines.")}
                    disabled={isLoading || status === 'completed' || !sessionId || isListening}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.45rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}
                    title="Simulate speech-to-text dictation"
                >
                    <Sparkles size={13} /> Demo Voice
                </button>

                <button
                    className="btn btn-primary"
                    onClick={sendMessage}
                    disabled={isLoading || status === 'completed' || !inputValue.trim() || !sessionId}
                >
                    {isLoading ? <span className="spinner" /> : 'Send'}
                </button>
            </div>
        </div>
    );
}
