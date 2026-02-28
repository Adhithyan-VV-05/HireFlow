import React, { useState, useEffect, useRef } from 'react';
import ChatBubble from '../components/ChatBubble';
import { api } from '../api/client';

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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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

        const userMessage = inputValue.trim();
        setInputValue('');
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
            <div className="chat-header">
                {onBack && (
                    <button className="btn btn-secondary btn-sm" onClick={onBack}>
                        ← Back
                    </button>
                )}
                <div className="chat-header-info">
                    <h2>🎙️ AI Interview — {candidateName}</h2>
                    <p>Position: {jobTitle}</p>
                </div>
                {status === 'active' && (
                    <span style={{
                        marginLeft: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.75rem',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)',
                        color: 'var(--accent-400)'
                    }}>
                        ● Live
                    </span>
                )}
                {status === 'completed' && (
                    <span style={{
                        marginLeft: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.75rem',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
                        color: 'var(--primary-400)'
                    }}>
                        ✓ Completed
                    </span>
                )}
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
                    <ChatBubble key={idx} role={msg.role} content={msg.content} />
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

            {/* Input */}
            <div className="chat-input-area">
                <input
                    type="text"
                    className="chat-input"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={status === 'completed' ? 'Interview completed' : 'Type your response...'}
                    disabled={isLoading || status === 'completed' || !sessionId}
                />
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
