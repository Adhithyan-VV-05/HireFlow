import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import VoiceInputButton from '../components/ui/VoiceInputButton';
import VoiceConvertingIndicator from '../components/ui/VoiceConvertingIndicator';
import { Sparkles, Volume2, VolumeX } from 'lucide-react';

/**
 * AptitudeChatbot
 * Full-featured AI aptitude interview chatbot connected to the backend.
 * Props:
 *   candidateId  – the candidate's ID for the aptitude session
 *   onClose      – callback to go back to the interviews list
 */
export default function AptitudeChatbot({ candidateId, onClose }) {
    const [phase, setPhase] = useState('intro');   // intro | loading | chat | result
    const [sessionId, setSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [questionNumber, setQuestionNumber] = useState(0);
    const [liveScores, setLiveScores] = useState({});

    // SpeechSynthesis for AI Interviewer questions
    const {
        speak,
        cancel: cancelSpeech,
        isSpeaking: isTtsSpeaking,
        isMuted: isTtsMuted,
        toggleMute: toggleTtsMute
    } = useSpeechSynthesis();

    // Voice recognition hook with live conversion tracking (SpeechRecognition / webkitSpeechRecognition)
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
        onTranscriptChange: (text) => setInput(text)
    });

    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, phase]);

    // Focus input on chat phase
    useEffect(() => {
        if (phase === 'chat') inputRef.current?.focus();
    }, [phase, sending]);

    const startTest = async () => {
        setPhase('loading');
        setError('');
        try {
            const data = await api.startAptitude(candidateId);
            setSessionId(data.session_id);
            setMessages([{ role: 'ai', content: data.message }]);
            setQuestionNumber(data.question_number || 1);
            setPhase('chat');
            if (data.message) speak(data.message);
        } catch (err) {
            setError(err.message || 'Failed to start aptitude test.');
            setPhase('intro');
        }
    };

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || sending || !sessionId) return;
        cancelSpeech();
        if (isListening) stopListening();
        setInput('');
        resetTranscript('');
        setSending(true);
        setMessages(prev => [...prev, { role: 'user', content: text }]);

        try {
            const data = await api.sendAptitudeMessage({ session_id: sessionId, message: text });
            setMessages(prev => [...prev, { role: 'ai', content: data.message }]);
            setQuestionNumber(data.question_number || questionNumber);
            if (data.scores) setLiveScores(data.scores);
            if (data.message) speak(data.message);

            if (data.status === 'completed') {
                const res = await api.getAptitudeResult(sessionId);
                setResult(res);
                setPhase('result');
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'system', content: `⚠️ ${err.message}` }]);
        } finally {
            setSending(false);
        }
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // ── Derived stats ───────────────────────────────────────────
    const scoreValues = Object.values(liveScores);
    const avgScore = scoreValues.length
        ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
        : 0;
    const progressPct = Math.min((questionNumber - 1) / 8 * 100, 100);

    const getScoreColor = (s) => {
        if (s >= 8) return '#10b981';
        if (s >= 6) return '#6366f1';
        if (s >= 4) return '#f97316';
        return '#f43f5e';
    };

    const getGrade = (avg) => {
        if (avg >= 8.5) return { label: 'Exceptional', emoji: '🏆', color: '#10b981' };
        if (avg >= 7) return { label: 'Strong', emoji: '🌟', color: '#6366f1' };
        if (avg >= 5.5) return { label: 'Good', emoji: '👍', color: '#f97316' };
        if (avg >= 4) return { label: 'Average', emoji: '📈', color: '#f59e0b' };
        return { label: 'Needs Work', emoji: '💪', color: '#f43f5e' };
    };

    // ── INTRO SCREEN ────────────────────────────────────────────
    if (phase === 'intro') {
        return (
            <div className="aptitude-shell">
                <div className="aptitude-intro-card">
                    <button className="aptitude-back-btn" onClick={onClose}>← Back</button>
                    <div className="aptitude-intro-icon">🧠</div>
                    <h1 className="aptitude-intro-title">AI Aptitude Interview</h1>
                    <p className="aptitude-intro-subtitle">
                        Personalised questions based on your resume skills.<br />
                        The AI will evaluate your technical depth and reasoning.
                    </p>

                    <div className="aptitude-intro-features">
                        <div className="aptitude-feature">
                            <span className="aptitude-feature-icon">🎯</span>
                            <span>8 adaptive questions</span>
                        </div>
                        <div className="aptitude-feature">
                            <span className="aptitude-feature-icon">⏱</span>
                            <span>~10–15 minutes</span>
                        </div>
                        <div className="aptitude-feature">
                            <span className="aptitude-feature-icon">📊</span>
                            <span>Real-time scoring</span>
                        </div>
                        <div className="aptitude-feature">
                            <span className="aptitude-feature-icon">🤖</span>
                            <span>AI-powered feedback</span>
                        </div>
                    </div>

                    <div className="aptitude-tips-box">
                        <h4>💡 Tips for best results</h4>
                        <ul>
                            <li>Be specific — use real examples from your experience</li>
                            <li>Include technical details where appropriate</li>
                            <li>Take your time before answering</li>
                        </ul>
                    </div>

                    {error && <div className="aptitude-error">{error}</div>}

                    <button className="aptitude-start-btn" onClick={startTest}>
                        <span>🚀</span> Start Aptitude Test
                    </button>
                </div>
            </div>
        );
    }

    // ── LOADING SCREEN ──────────────────────────────────────────
    if (phase === 'loading') {
        return (
            <div className="aptitude-shell">
                <div className="aptitude-loading-card">
                    <div className="aptitude-loading-orb" />
                    <h2>Personalizing your test…</h2>
                    <p>Analysing your resume skills and crafting your first question</p>
                </div>
            </div>
        );
    }

    // ── RESULT SCREEN ───────────────────────────────────────────
    if (phase === 'result' && result) {
        const finalScores = result.per_question_scores || {};
        const finalVals = Object.values(finalScores);
        const finalAvg = finalVals.length
            ? finalVals.reduce((a, b) => a + b, 0) / finalVals.length
            : 0;
        const grade = getGrade(finalAvg);
        const pct = Math.round(finalAvg * 10);

        return (
            <div className="aptitude-shell">
                <div className="aptitude-result-container">
                    <button className="aptitude-back-btn" onClick={onClose}>← Back to Interviews</button>

                    <div className="aptitude-result-header">
                        <div className="aptitude-result-emoji">{grade.emoji}</div>
                        <h2 className="aptitude-result-title">Interview Complete!</h2>
                        <p className="aptitude-result-sub">Here's how you performed in your assessment</p>
                    </div>

                    {/* Big Score */}
                    <div className="aptitude-score-ring-wrap">
                        <svg className="aptitude-score-ring" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth="10" />
                            <circle
                                cx="60" cy="60" r="50"
                                fill="none"
                                stroke={grade.color}
                                strokeWidth="10"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 50}`}
                                strokeDashoffset={`${2 * Math.PI * 50 * (1 - pct / 100)}`}
                                transform="rotate(-90 60 60)"
                                style={{ transition: 'stroke-dashoffset 1.5s ease' }}
                            />
                        </svg>
                        <div className="aptitude-score-center">
                            <span className="aptitude-score-num" style={{ color: grade.color }}>{pct}%</span>
                            <span className="aptitude-score-label">{grade.label}</span>
                        </div>
                    </div>

                    {/* Per-question breakdown */}
                    {Object.keys(finalScores).length > 0 && (
                        <div className="aptitude-breakdown-card">
                            <h3>📊 Question Breakdown</h3>
                            <div className="aptitude-breakdown-list">
                                {Object.entries(finalScores).map(([q, s]) => (
                                    <div key={q} className="aptitude-breakdown-row">
                                        <span className="aptitude-breakdown-q">{q}</span>
                                        <div className="aptitude-breakdown-bar-track">
                                            <div
                                                className="aptitude-breakdown-bar-fill"
                                                style={{
                                                    width: `${s * 10}%`,
                                                    background: getScoreColor(s),
                                                }}
                                            />
                                        </div>
                                        <span className="aptitude-breakdown-score" style={{ color: getScoreColor(s) }}>
                                            {s}/10
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Stats row */}
                    <div className="aptitude-stats-row">
                        <div className="aptitude-stat-box">
                            <span className="aptitude-stat-val">{result.total_questions}</span>
                            <span className="aptitude-stat-lbl">Questions</span>
                        </div>
                        <div className="aptitude-stat-box">
                            <span className="aptitude-stat-val" style={{ color: grade.color }}>{pct}%</span>
                            <span className="aptitude-stat-lbl">Overall</span>
                        </div>
                        <div className="aptitude-stat-box">
                            <span className="aptitude-stat-val">{grade.emoji}</span>
                            <span className="aptitude-stat-lbl">{grade.label}</span>
                        </div>
                    </div>

                    <button className="aptitude-start-btn" style={{ marginTop: '1.5rem' }} onClick={onClose}>
                        ✅ Done
                    </button>
                </div>
            </div>
        );
    }

    // ── CHAT SCREEN ─────────────────────────────────────────────
    return (
        <div className="aptitude-shell">
            <div className="aptitude-chat-layout">

                {/* Left: Chat Area */}
                <div className="aptitude-chat-main">
                    {/* Chat Header */}
                    <div className="aptitude-chat-header">
                        <button className="aptitude-back-btn-sm" onClick={onClose}>←</button>
                        <div className="aptitude-chat-header-info">
                            <div className="aptitude-ai-avatar">🤖</div>
                            <div>
                                <div className="aptitude-chat-header-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>AI Aptitude Interviewer</span>
                                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: 4, background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', fontWeight: 700 }}>
                                        {recognitionEngine}
                                    </span>
                                </div>
                                <div className="aptitude-chat-header-sub">
                                    {sending ? (
                                        <span className="aptitude-typing">
                                            <span />
                                            <span />
                                            <span />
                                            Thinking…
                                        </span>
                                    ) : 'Online — ready for your answer'}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={toggleTtsMute}
                                className="icon-btn"
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: isTtsMuted ? '#f87171' : '#10b981',
                                    cursor: 'pointer'
                                }}
                                title={isTtsMuted ? "Unmute AI spoken audio" : "Mute AI audio"}
                            >
                                {isTtsMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                            </button>
                            <div className="aptitude-qnum-badge">
                                Q {Math.min(questionNumber, 8)} / 8
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="aptitude-messages">
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`aptitude-msg aptitude-msg-${msg.role}`}
                                style={{ animationDelay: `${i * 0.05}s` }}
                            >
                                {msg.role === 'ai' && (
                                    <div className="aptitude-msg-avatar">🤖</div>
                                )}
                                <div className={`aptitude-bubble aptitude-bubble-${msg.role}`}>
                                    <div>{msg.content}</div>
                                    {msg.role === 'ai' && (
                                        <button
                                            type="button"
                                            onClick={() => speak(msg.content)}
                                            style={{
                                                marginTop: '0.35rem',
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#a5b4fc',
                                                fontSize: '0.72rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.3rem',
                                                padding: 0
                                            }}
                                            title="Replay audio of this question"
                                        >
                                            <Volume2 size={12} /> Listen
                                        </button>
                                    )}
                                </div>
                                {msg.role === 'user' && (
                                    <div className="aptitude-msg-avatar aptitude-user-avatar">👤</div>
                                )}
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {sending && (
                            <div className="aptitude-msg aptitude-msg-ai">
                                <div className="aptitude-msg-avatar">🤖</div>
                                <div className="aptitude-bubble aptitude-bubble-ai aptitude-typing-bubble">
                                    <span /><span /><span />
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Lively Voice Converting & Loading Animation Indicator */}
                    <div style={{ padding: '0 1rem' }}>
                        <VoiceConvertingIndicator
                            isListening={isListening}
                            isConverting={isConverting}
                            isSpeaking={isSpeaking}
                            audioLevel={audioLevel}
                            interimText={interimText}
                            targetLabel="Interview Answer"
                        />
                    </div>

                    {voiceError && (
                        <div style={{ margin: '0 1rem 0.5rem', padding: '0.4rem 1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>⚠️ {voiceError}</span>
                        </div>
                    )}

                    <div className="aptitude-input-area" style={{ position: 'relative' }}>
                        <textarea
                            ref={inputRef}
                            className={`aptitude-input ${isListening ? 'm4-transcript-box-active' : ''}`}
                            placeholder={isListening ? "Listening... Your spoken words are being lively converted here in real-time." : "Type your answer or click the mic to speak… (Enter to send)"}
                            value={input}
                            onChange={e => {
                                setInput(e.target.value);
                                resetTranscript(e.target.value);
                            }}
                            onKeyDown={handleKey}
                            disabled={sending}
                            rows={2}
                        />

                        {/* Test Voice Demo Button */}
                        <button
                            type="button"
                            className="icon-btn"
                            onClick={() => simulateVoiceInput("I prioritize decoupling components, writing predictable asynchronous state, and verifying edge cases.")}
                            title="Simulate speech-to-text audio conversion"
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(99, 102, 241, 0.12)',
                                border: '1px solid rgba(99, 102, 241, 0.25)',
                                color: '#a5b4fc',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Sparkles size={16} />
                        </button>

                        <VoiceInputButton
                            isListening={isListening}
                            audioLevel={audioLevel}
                            isSupported={voiceSupported}
                            onClick={() => toggleListening(input)}
                            disabled={sending}
                            size="md"
                            showWaveform={true}
                            title={isListening ? "Stop voice recording" : "Speak answer with microphone"}
                        />
                        <button
                            className="aptitude-send-btn"
                            onClick={sendMessage}
                            disabled={sending || !input.trim()}
                            title="Send answer"
                        >
                            {sending ? <span className="aptitude-spinner" /> : '➤'}
                        </button>
                    </div>
                </div>

                {/* Right: Live Score Panel */}
                <div className="aptitude-sidebar">
                    <div className="aptitude-sidebar-card">
                        <h3 className="aptitude-sidebar-title">📈 Live Progress</h3>

                        {/* Progress bar */}
                        <div className="aptitude-progress-section">
                            <div className="aptitude-progress-label">
                                <span>Questions</span>
                                <span>{Math.max(questionNumber - 1, 0)} / 8 done</span>
                            </div>
                            <div className="aptitude-progress-track">
                                <div
                                    className="aptitude-progress-fill"
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                        </div>

                        {/* Average Score */}
                        {scoreValues.length > 0 && (
                            <div className="aptitude-avg-score">
                                <span className="aptitude-avg-label">Avg Score</span>
                                <span
                                    className="aptitude-avg-val"
                                    style={{ color: getScoreColor(avgScore) }}
                                >
                                    {avgScore.toFixed(1)}/10
                                </span>
                            </div>
                        )}

                        {/* Individual scores */}
                        {Object.keys(liveScores).length > 0 && (
                            <div className="aptitude-live-scores">
                                {Object.entries(liveScores).map(([q, s]) => (
                                    <div key={q} className="aptitude-live-score-row">
                                        <span className="aptitude-live-q">{q}</span>
                                        <div className="aptitude-live-bar-track">
                                            <div
                                                className="aptitude-live-bar-fill"
                                                style={{
                                                    width: `${s * 10}%`,
                                                    background: getScoreColor(s),
                                                }}
                                            />
                                        </div>
                                        <span
                                            className="aptitude-live-score-val"
                                            style={{ color: getScoreColor(s) }}
                                        >{s}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {scoreValues.length === 0 && (
                            <p className="aptitude-sidebar-hint">
                                Scores will appear here as you answer each question.
                            </p>
                        )}
                    </div>

                    {/* Tips */}
                    <div className="aptitude-sidebar-card aptitude-tips-card">
                        <h4 className="aptitude-sidebar-title">💡 Tips</h4>
                        <ul className="aptitude-tips-list">
                            <li>Give detailed, concrete examples</li>
                            <li>Mention relevant tools & technologies</li>
                            <li>Explain your reasoning clearly</li>
                            <li>It's ok to think before answering</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
