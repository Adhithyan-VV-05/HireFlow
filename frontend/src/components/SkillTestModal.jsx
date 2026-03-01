import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';

export default function SkillTestModal({ isOpen, onClose, skill, onComplete }) {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('loading'); // loading, active, completed, locked, submitting
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [timer, setTimer] = useState(25);
    const [testRecs, setTestRecs] = useState([]);
    const [motivationalQuote, setMotivationalQuote] = useState('');
    const [results, setResults] = useState({
        score: 0,
        correct_count: 0,
        wrong_count: 0,
        skipped_count: 0,
        answers: []
    });

    const timerRef = useRef(null);

    useEffect(() => {
        if (isOpen && skill) {
            startTest();
        }
        return () => clearInterval(timerRef.current);
    }, [isOpen, skill]);

    const startTest = async () => {
        setLoading(true);
        setStatus('loading');
        try {
            const data = await api.getSkillTestQuestions(skill);
            if (data.status === 'locked') {
                setStatus('locked');
            } else {
                setQuestions(data.questions);
                setStatus('active');
                resetTimer(data.questions[0].time_limit || 25);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to load questions.');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const resetTimer = (customTime = 25) => {
        setTimer(customTime);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    handleNext(true); // Auto-skip on timeout
                    return customTime;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleNext = async (isSkip = false) => {
        const q = questions[currentIdx];
        let newResults = { ...results };

        if (isSkip) {
            newResults.score -= 1;
            newResults.skipped_count += 1;
            newResults.answers.push({ q: q.question, status: 'skipped' });
        } else {
            const isCorrect = selectedOption === q.answer;
            if (isCorrect) {
                newResults.score += 5;
                newResults.correct_count += 1;
            } else {
                newResults.score -= 2;
                newResults.wrong_count += 1;
            }
            newResults.answers.push({ q: q.question, status: isCorrect ? 'correct' : 'wrong', selected: selectedOption, correct: q.answer });
        }

        setResults(newResults);
        setSelectedOption(null);
        clearInterval(timerRef.current);

        if (currentIdx < questions.length - 1) {
            const nxt = currentIdx + 1;
            setCurrentIdx(nxt);
            resetTimer(questions[nxt].time_limit || 25);
        } else {
            finishTest(newResults);
        }
    };

    const finishTest = async (finalResults) => {
        setStatus('submitting');
        const percentage = Math.max(0, (finalResults.score / 100) * 100);
        try {
            await api.submitSkillTest({
                skill_name: skill,
                score: finalResults.score,
                percentage: percentage,
                correct_count: finalResults.correct_count,
                wrong_count: finalResults.wrong_count,
                skipped_count: finalResults.skipped_count
            });

            // Fetch recommendations if score < 80%
            if (percentage < 80) {
                const count = percentage < 20 ? 5 : (percentage < 40 ? 3 : (percentage < 60 ? 2 : 1));
                const recData = await api.getUpskillingRecommendations('');
                // Filter recommendations for similar skill or just get general ones for this skill
                // For now, let's just use the LLM helper if possible, or mock
                const skillRecs = recData.recommendations?.find(r => r.skill.toLowerCase().includes(skill.toLowerCase()))?.courses || [];
                setTestRecs(skillRecs.slice(0, count));

                const quotes = [
                    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
                    "Don't let what you cannot do interfere with what you can do.",
                    "The expert in anything was once a beginner. Keep learning!",
                    "Your potential is endless. Go do what you were created to do.",
                    "Every mistake is a step closer to mastery. You've got this!"
                ];
                setMotivationalQuote(quotes[Math.floor(Math.random() * quotes.length)]);
            }

            setStatus('completed');
            if (onComplete) onComplete();
        } catch (err) {
            console.error(err);
            setStatus('completed');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content skill-test-modal glass-card">
                <div className="modal-header">
                    <h2>Rapid Fire: {skill}</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {status === 'loading' && (
                        <div className="loading-state">
                            <span className="spinner" />
                            <p>Preparing Question set for you...</p>
                        </div>
                    )}

                    {status === 'locked' && (
                        <div className="locked-state" style={{ textAlign: 'center', padding: '2rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                            <h3>Test Locked</h3>
                            <p className="muted-text">You have already attempted this test.</p>
                            <div className="premium-banner" style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '12px', marginTop: '1.5rem', border: '1px var(--accent-500) solid' }}>
                                <p style={{ fontWeight: 600, color: 'var(--accent-400)' }}>Unlock retakes for 500Rs or Purchase Premium</p>
                                <button className="hub-btn hub-btn-primary" style={{ marginTop: '1rem' }} onClick={() => alert('Payment gateway coming soon!')}>Upgrade Now</button>
                            </div>
                        </div>
                    )}

                    {status === 'active' && questions.length > 0 && (
                        <div className="test-active">
                            <div className="test-progress-header">
                                <span className="q-count">Question {currentIdx + 1} of 20</span>
                                <div className="timer-ring">
                                    <span className={`timer-text ${timer <= 5 ? 'timer-low' : ''}`}>{timer}s</span>
                                </div>
                                <div className="live-score">Score: {results.score}</div>
                            </div>

                            <div className="question-box">
                                <h3 className="question-text">{questions[currentIdx].question}</h3>
                                <div className="options-grid">
                                    {questions[currentIdx].options.map((opt, i) => {
                                        const label = String.fromCharCode(65 + i);
                                        return (
                                            <button
                                                key={label}
                                                className={`option-btn ${selectedOption === label ? 'selected' : ''}`}
                                                onClick={() => setSelectedOption(label)}
                                            >
                                                <span className="opt-label">{label}</span>
                                                <span className="opt-text">{opt}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="test-footer">
                                <button className="skip-btn" onClick={() => handleNext(true)}>Skip (-1)</button>
                                <button
                                    className="next-btn"
                                    disabled={!selectedOption}
                                    onClick={() => handleNext(false)}
                                >
                                    {currentIdx === 19 ? 'Submit Test' : 'Next Question'}
                                </button>
                            </div>
                        </div>
                    )}

                    {status === 'submitting' && (
                        <div className="loading-state">
                            <span className="spinner" />
                            <p>Calculating final score and updating profile...</p>
                        </div>
                    )}

                    {status === 'completed' && (
                        <div className="result-state" style={{ textAlign: 'center' }}>
                            <div className="result-header">
                                <div className="result-percentage">
                                    {Math.max(0, (results.score / 100) * 100).toFixed(0)}%
                                </div>
                                <h3>Skill Accuracy: {skill}</h3>
                            </div>

                            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '2rem' }}>
                                <div className="stat-card">
                                    <div className="stat-val" style={{ color: 'var(--emerald-400)' }}>{results.correct_count}</div>
                                    <div className="stat-label">Correct</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-val" style={{ color: 'var(--rose-400)' }}>{results.wrong_count}</div>
                                    <div className="stat-label">Wrong</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-val" style={{ color: 'var(--gray-400)' }}>{results.skipped_count}</div>
                                    <div className="stat-label">Skipped</div>
                                </div>
                            </div>

                            <div className="final-score-info">
                                Total Marks Obtained: <strong>{results.score}</strong> / 100
                            </div>

                            <p className="muted-text" style={{ marginTop: '1.5rem' }}>
                                Your profile has been updated. You are now a <strong>Verified</strong> candidate in {skill}!
                            </p>

                            {testRecs.length > 0 && (
                                <div className="test-recommendations">
                                    <div className="quote-box">
                                        <span className="quote-icon">“</span>
                                        <p>{motivationalQuote}</p>
                                    </div>
                                    <h4 style={{ color: 'var(--accent-400)', marginBottom: '1rem' }}>Recommended Upskilling for {skill}</h4>
                                    <div className="recs-list">
                                        {testRecs.map((rec, i) => (
                                            <a key={i} href={rec.url} target="_blank" rel="noreferrer" className="rec-link-card">
                                                <div className="rec-info">
                                                    <span className="rec-provider">{rec.provider}</span>
                                                    <span className="rec-title">{rec.title}</span>
                                                </div>
                                                <div className="rec-meta">
                                                    <span>{rec.level}</span> • <span>{rec.duration}</span>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button className="hub-btn hub-btn-primary" style={{ marginTop: '2rem', width: '100%' }} onClick={onClose}>Back to Profile</button>
                        </div>
                    )}
                </div>
            </div>
            <style jsx="true">{`
                .skill-test-modal {
                    max-width: 800px;
                    width: 90%;
                    padding: 2rem;
                    background: #111;
                    color: white;
                }
                .test-progress-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }
                .timer-ring {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    border: 3px solid var(--accent-500);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .timer-text { font-weight: bold; font-size: 1.2rem; }
                .timer-low { color: var(--rose-400); animation: pulse 1s infinite; }
                .question-box { margin-bottom: 2rem; }
                .question-text { font-size: 1.3rem; margin-bottom: 1.5rem; line-height: 1.4; }
                .options-grid { display: grid; gap: 0.75rem; }
                .option-btn {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    padding: 1rem;
                    border-radius: 8px;
                    color: white;
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .option-btn:hover { background: rgba(255,255,255,0.1); }
                .option-btn.selected {
                    background: rgba(99, 102, 241, 0.2);
                    border-color: var(--accent-500);
                }
                .opt-label {
                    background: rgba(255,255,255,0.1);
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    font-weight: bold;
                }
                .test-footer {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 2rem;
                }
                .skip-btn { background: none; border: 1px solid var(--gray-600); color: var(--gray-400); padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; }
                .next-btn { background: var(--accent-600); color: white; border: none; padding: 0.75rem 2rem; border-radius: 8px; cursor: pointer; font-weight: 600; }
                .next-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                
                .result-percentage {
                    font-size: 4rem;
                    font-weight: 800;
                    color: var(--accent-400);
                    margin-bottom: 0.5rem;
                }
                .stat-card {
                    background: rgba(255,255,255,0.03);
                    padding: 1rem;
                    border-radius: 12px;
                }
                .stat-val { font-size: 2rem; font-weight: bold; }
                .stat-label { font-size: 0.8rem; color: var(--gray-500); text-transform: uppercase; }
                .final-score-info {
                    margin-top: 2rem;
                    font-size: 1.1rem;
                    padding: 1rem;
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                }

                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }

                .test-recommendations {
                    margin-top: 2.5rem;
                    text-align: left;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    padding-top: 2rem;
                }
                .quote-box {
                    background: rgba(99, 102, 241, 0.1);
                    padding: 1.5rem;
                    border-radius: 12px;
                    border-left: 4px solid var(--accent-500);
                    margin-bottom: 2rem;
                    font-style: italic;
                    position: relative;
                }
                .quote-icon {
                    position: absolute;
                    top: -10px;
                    left: 10px;
                    font-size: 3rem;
                    color: rgba(99, 102, 241, 0.2);
                    font-family: serif;
                }
                .recs-list {
                    display: grid;
                    gap: 1rem;
                }
                .rec-link-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.08);
                    padding: 1rem 1.5rem;
                    border-radius: 10px;
                    text-decoration: none;
                    transition: all 0.2s;
                }
                .rec-link-card:hover {
                    background: rgba(255,255,255,0.07);
                    border-color: var(--accent-500);
                    transform: translateX(5px);
                }
                .rec-title { display: block; font-weight: 600; color: white; margin-top: 0.2rem; }
                .rec-provider { font-size: 0.75rem; color: var(--accent-400); text-transform: uppercase; font-weight: 800; }
                .rec-meta { font-size: 0.85rem; color: var(--gray-500); }
            `}</style>
        </div>
    );
}
