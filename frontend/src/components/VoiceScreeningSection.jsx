import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import {
    Mic,
    MicOff,
    Square,
    Play,
    Volume2,
    VolumeX,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Award,
    ArrowRight,
    ShieldAlert,
    Sparkles,
    User,
    Briefcase,
    Trash2
} from 'lucide-react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import VoiceInputButton from './ui/VoiceInputButton';
import VoiceConvertingIndicator from './ui/VoiceConvertingIndicator';

export default function VoiceScreeningSection({
    candidates = [],
    jobs = [],
    selectedCandidateId = '',
    isCandidateMode = false,
    candidateProfile = null,
    onCandidateUpdated = () => {},
    onViewCandidate = () => {},
}) {
    // Selection state
    const [candId, setCandId] = useState(candidateProfile?.candidate_id || candidateProfile?.id || selectedCandidateId || (candidates[0]?.id || ''));
    const [jobId, setJobId] = useState(jobs[0]?.id || '');

    // Synchronize prop change and asynchronous data loading
    useEffect(() => {
        if (candidateProfile?.candidate_id || candidateProfile?.id) {
            setCandId(candidateProfile.candidate_id || candidateProfile.id);
        } else if (selectedCandidateId) {
            setCandId(selectedCandidateId);
        } else if (!candId && candidates.length > 0) {
            setCandId(candidates[0].id || candidates[0].candidate_id);
        }
    }, [selectedCandidateId, candidates, candId, candidateProfile]);

    useEffect(() => {
        if (!jobId && jobs.length > 0) {
            setJobId(jobs[0].id);
        }
    }, [jobs, jobId]);

    // Screening session state
    const [session, setSession] = useState(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const [screeningState, setScreeningState] = useState('idle'); // 'idle', 'ready', 'recording', 'submitting', 'completed'
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [transcript, setTranscript] = useState('');
    const [ttsMuted, setTtsMuted] = useState(false);
    const [assessmentReport, setAssessmentReport] = useState(null);
    const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);
    const [questionWords, setQuestionWords] = useState([]);
    const [spokenWordIndex, setSpokenWordIndex] = useState(-1);

    // Refs
    const timerRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis || null);
    const speechIntervalRef = useRef(null);

    // Voice recognition hook with live conversion tracking
    const {
        isListening,
        isConverting,
        isSpeaking,
        interimText,
        audioLevel,
        error: voiceError,
        isSupported: voiceSupported,
        recognitionEngine,
        startListening,
        stopListening,
        resetTranscript,
        simulateVoiceInput
    } = useVoiceInput({
        onTranscriptChange: (newText) => {
            setTranscript(newText);
        }
    });

    // Selected objects
    const currentCandidate = candidates.find(c => (c.id === candId || c.candidate_id === candId)) || candidates[0];
    const currentJob = jobs.find(j => j.id === jobId) || jobs[0];

    // Clean up timer and speech on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
            stopListening();
            if (synthRef.current) {
                synthRef.current.cancel();
            }
        };
    }, [stopListening]);

    // Keep screeningState in sync with voice input
    useEffect(() => {
        if (isListening && screeningState === 'ready') {
            setScreeningState('recording');
        } else if (!isListening && screeningState === 'recording') {
            setScreeningState('ready');
        }
    }, [isListening, screeningState]);

    // Timer management
    useEffect(() => {
        if (screeningState === 'recording') {
            timerRef.current = setInterval(() => {
                setTimerSeconds(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [screeningState]);

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Synchronize question words whenever active question changes
    useEffect(() => {
        if (session?.current_question?.question) {
            const words = session.current_question.question.trim().split(/\s+/);
            setQuestionWords(words);
        } else {
            setQuestionWords([]);
        }
        setSpokenWordIndex(-1);
    }, [session?.current_question]);

    // Text to Speech for AI Interviewer Question with live word-by-word karaoke highlight
    const speakQuestion = (text) => {
        if (!synthRef.current || ttsMuted || !text) return;
        try {
            if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
            synthRef.current.cancel();

            // Crucial Chrome fix: resume speech synthesis engine if paused
            if (synthRef.current.paused) {
                synthRef.current.resume();
            }

            const cleanText = String(text || '').trim();
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            utterance.lang = 'en-US';

            // Anchor globally to prevent Chromium V8 garbage-collection from cutting off audio
            if (typeof window !== 'undefined') {
                window.__voiceScreeningUtterance = utterance;
            }

            const words = cleanText.split(/\s+/);
            setQuestionWords(words);
            setSpokenWordIndex(-1);

            let currentStepIdx = 0;
            utterance.onstart = () => {
                setIsSpeakingQuestion(true);
                setSpokenWordIndex(0);
                // Lively rhythm ticker: advances word-by-word synchronously
                speechIntervalRef.current = setInterval(() => {
                    currentStepIdx++;
                    if (currentStepIdx < words.length) {
                        setSpokenWordIndex(prev => Math.max(prev, currentStepIdx));
                    } else {
                        if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
                    }
                }, 310);
            };

            // Real-time boundary event fires for exact spoken word alignment if supported
            utterance.onboundary = (event) => {
                if (event.name === 'word' || !event.name) {
                    const charIdx = event.charIndex;
                    let accum = 0;
                    for (let i = 0; i < words.length; i++) {
                        accum += words[i].length + 1;
                        if (accum > charIdx) {
                            setSpokenWordIndex(i);
                            currentStepIdx = i;
                            break;
                        }
                    }
                }
            };

            utterance.onend = () => {
                if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
                setIsSpeakingQuestion(false);
                setSpokenWordIndex(-1);
                if (typeof window !== 'undefined') {
                    window.__voiceScreeningUtterance = null;
                }
            };

            utterance.onerror = () => {
                if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
                setIsSpeakingQuestion(false);
                setSpokenWordIndex(-1);
                if (typeof window !== 'undefined') {
                    window.__voiceScreeningUtterance = null;
                }
            };

            // Choose an articulate natural English voice if available
            const voices = synthRef.current.getVoices() || [];
            const naturalVoice = voices.find(v =>
                v.lang.startsWith('en') &&
                (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Microsoft') || v.name.includes('Jenny'))
            ) || voices.find(v => v.lang.startsWith('en'));

            if (naturalVoice) utterance.voice = naturalVoice;

            synthRef.current.speak(utterance);
        } catch (err) {
            console.warn('[TTS] Failed to speak question:', err);
            if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
            setIsSpeakingQuestion(false);
            setSpokenWordIndex(-1);
        }
    };

    // Start a new screening session
    const handleStartScreeningSession = async () => {
        if (!candId) {
            alert('Please select a candidate to begin voice screening.');
            return;
        }

        setIsInitializing(true);
        setAssessmentReport(null);
        setTranscript('');
        resetTranscript('');
        setTimerSeconds(0);

        try {
            const data = await api.startVoiceScreening({
                candidate_id: candId,
                job_id: jobId || undefined,
                question_count: 3
            });

            setSession(data);
            setScreeningState('ready');

            // Read the first question aloud
            if (data.current_question?.question) {
                speakQuestion(data.current_question.question);
            }
        } catch (err) {
            alert(err.message || 'Failed to initialize voice screening.');
        } finally {
            setIsInitializing(false);
        }
    };

    // Recording toggles
    const handleStartRecording = () => {
        if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
        if (synthRef.current) {
            synthRef.current.cancel();
            setIsSpeakingQuestion(false);
            setSpokenWordIndex(-1);
        }
        setScreeningState('recording');
        startListening(transcript);
    };

    const handleStopRecording = () => {
        stopListening();
        setScreeningState('ready');
    };

    // Submit answer and advance
    const handleSubmitCurrentAnswer = async () => {
        if (!session) return;
        if (!transcript.trim()) {
            if (!window.confirm('The transcript is currently empty. Would you like to submit without an answer or continue recording?')) {
                return;
            }
        }

        // Stop recording if active
        if (screeningState === 'recording' || isListening) {
            handleStopRecording();
        }

        setScreeningState('submitting');
        const qIndex = session.current_question_index;

        try {
            const result = await api.submitVoiceResponse(session.session_id, {
                question_index: qIndex,
                candidate_response: transcript.trim() || 'No answer provided.',
                duration_seconds: timerSeconds
            });

            setTranscript('');
            resetTranscript('');
            setTimerSeconds(0);

            if (result.is_completed) {
                setScreeningState('completed');
                setAssessmentReport(result.final_report);
                onCandidateUpdated();
            } else {
                setScreeningState('ready');
                setSession(prev => ({
                    ...prev,
                    current_question_index: result.next_question_index,
                    current_question: result.next_question
                }));

                // Read next question aloud
                if (result.next_question?.question) {
                    speakQuestion(result.next_question.question);
                }
            }
        } catch (err) {
            alert(err.message || 'Failed to submit voice response.');
            setScreeningState('ready');
        }
    };

    // Manual early finish
    const handleFinalizeScreening = async () => {
        if (!session) return;
        if (!window.confirm('Are you sure you want to finalize this screening session and generate the preliminary assessment?')) {
            return;
        }

        if (screeningState === 'recording' || isListening) {
            handleStopRecording();
        }

        setScreeningState('submitting');
        try {
            const report = await api.completeVoiceScreening(session.session_id);
            setScreeningState('completed');
            setAssessmentReport(report);
            onCandidateUpdated();
        } catch (err) {
            alert(err.message || 'Failed to complete screening session.');
            setScreeningState('ready');
        }
    };

    const activeQuestion = session?.current_question;
    const currentQNum = (session?.current_question_index || 0) + 1;
    const totalQCount = session?.question_count || 3;

    return (
        <div className="m4-card voice-screening-container" id="voice-screening-section">
            <div className="m4-card-header">
                <div>
                    <h2 className="m4-card-title flex items-center gap-2">
                        <Mic className="w-5 h-5 text-indigo-500" />
                        AI Voice Screening Module
                        <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontWeight: 700 }}>
                            {recognitionEngine !== 'none' ? recognitionEngine : 'Web Speech API'}
                        </span>
                    </h2>
                    <p className="m4-card-subtitle">
                        Automated oral screenings with real-time speech recognition ({recognitionEngine !== 'none' ? recognitionEngine : 'SpeechRecognition'}), natural AI synthesis, and 5-dimension competency evaluation
                    </p>
                </div>
                <div className="voice-header-actions">
                    <button
                        className="m4-btn m4-btn-secondary"
                        onClick={() => setTtsMuted(!ttsMuted)}
                        title={ttsMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
                    >
                        {ttsMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-indigo-500" />}
                        <span className="hidden sm:inline">{ttsMuted ? 'Voice Muted' : 'Voice Active'}</span>
                    </button>
                    {session && screeningState !== 'completed' && (
                        <button
                            className="m4-btn m4-btn-secondary"
                            onClick={() => {
                                if (window.confirm('Reset current voice screening session?')) {
                                    handleStopRecording();
                                    setSession(null);
                                    setScreeningState('idle');
                                    setTranscript('');
                                    resetTranscript('');
                                    setTimerSeconds(0);
                                    if (timerRef.current) clearInterval(timerRef.current);
                                }
                            }}
                        >
                            <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Reset</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Candidate & Job Selection Bar */}
            {isCandidateMode ? (
                <div className="voice-candidate-info-card" id="candidate-voice-controls-bar">
                    <div className="voice-candidate-info-left">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white font-bold text-base shadow-sm">
                            {(candidateProfile?.name || currentCandidate?.name || 'C')[0]?.toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <strong className="text-sm text-slate-800 dark:text-slate-100">
                                    {candidateProfile?.name || currentCandidate?.name || 'Candidate'}
                                </strong>
                                <span className="m4-badge m4-badge-applied text-[11px] py-0.5 px-2">
                                    {candidateProfile?.current_status || currentCandidate?.current_status || 'Applied'}
                                </span>
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 block">
                                {candidateProfile?.email || currentCandidate?.email}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-1 max-w-sm">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            Target Role:
                        </label>
                        <select
                            className="m4-select w-full text-xs"
                            value={jobId}
                            onChange={(e) => setJobId(e.target.value)}
                            disabled={screeningState === 'recording' || screeningState === 'submitting'}
                        >
                            {jobs.map(j => (
                                <option key={j.id} value={j.id}>
                                    {j.title} ({j.required_skills?.length || 0} req. skills)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="voice-top-btn-wrapper">
                        {(!session || screeningState === 'idle') ? (
                            <button
                                className="m4-btn m4-btn-primary w-full sm:w-auto"
                                onClick={handleStartScreeningSession}
                                disabled={isInitializing || !candId}
                            >
                                {isInitializing ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4" />
                                )}
                                Start My Voice Test
                            </button>
                        ) : screeningState !== 'completed' ? (
                            <button
                                className="m4-btn m4-btn-secondary w-full sm:w-auto"
                                onClick={handleFinalizeScreening}
                                disabled={screeningState === 'submitting'}
                            >
                                Finish & Evaluate
                            </button>
                        ) : (
                            <button
                                className="m4-btn m4-btn-primary w-full sm:w-auto"
                                onClick={() => {
                                    setSession(null);
                                    setScreeningState('idle');
                                    setTranscript('');
                                    resetTranscript('');
                                    setTimerSeconds(0);
                                }}
                            >
                                Retake Screening
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="m4-voice-top-controls">
                    <div className="m4-field-group">
                        <label className="m4-field-label">Target Candidate</label>
                        <select
                            className="m4-select w-full"
                            value={candId}
                            onChange={(e) => setCandId(e.target.value)}
                            disabled={screeningState === 'recording' || screeningState === 'submitting'}
                        >
                            {candidates.map(c => (
                                <option key={c.id || c.candidate_id} value={c.id || c.candidate_id}>
                                    {c.name} ({c.current_status || 'Applied'}) — {c.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="m4-field-group">
                        <label className="m4-field-label">Target Job Role</label>
                        <select
                            className="m4-select w-full"
                            value={jobId}
                            onChange={(e) => setJobId(e.target.value)}
                            disabled={screeningState === 'recording' || screeningState === 'submitting'}
                        >
                            {jobs.map(j => (
                                <option key={j.id} value={j.id}>
                                    {j.title} ({j.required_skills?.length || 0} req. skills)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="voice-top-btn-wrapper">
                        {(!session || screeningState === 'idle') ? (
                            <button
                                className="m4-btn m4-btn-primary w-full sm:w-auto"
                                onClick={handleStartScreeningSession}
                                disabled={isInitializing || !candId}
                            >
                                {isInitializing ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4" />
                                )}
                                Start Screening
                            </button>
                        ) : screeningState !== 'completed' ? (
                            <button
                                className="m4-btn m4-btn-secondary w-full sm:w-auto"
                                onClick={handleFinalizeScreening}
                                disabled={screeningState === 'submitting'}
                            >
                                Finish & Evaluate
                            </button>
                        ) : (
                            <button
                                className="m4-btn m4-btn-primary w-full sm:w-auto"
                                onClick={() => {
                                    setSession(null);
                                    setScreeningState('idle');
                                    setTranscript('');
                                    resetTranscript('');
                                    setTimerSeconds(0);
                                }}
                            >
                                New Screening
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Mic Permission Warning Banner */}
            {voiceError && (
                <div className="voice-alert-banner">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-500" />
                    <div className="flex-1">
                        <strong>Audio Input Alert:</strong> {voiceError}
                    </div>
                </div>
            )}

            {/* IDLE STATE */}
            {(!session || screeningState === 'idle') && (
                <div className="voice-idle-placeholder">
                    <div className="voice-idle-icon-wrap">
                        <Mic className="w-7 h-7" />
                    </div>
                    <h3 className="voice-idle-title">
                        Ready to begin oral screening
                    </h3>
                    <p className="voice-idle-text">
                        Select candidate <strong>{currentCandidate?.name || 'Candidate'}</strong> and job <strong>{currentJob?.title || 'Job Role'}</strong> above, then click <em>Start Screening</em> to initiate the oral evaluation session with live voice transcription.
                    </p>
                    <button
                        className="m4-btn m4-btn-primary"
                        onClick={handleStartScreeningSession}
                        disabled={isInitializing}
                    >
                        <Play className="w-4 h-4" /> Start Screening Session
                    </button>
                </div>
            )}

            {/* ACTIVE SCREENING STAGE */}
            {session && screeningState !== 'completed' && (
                <div className="m4-voice-live-stage">
                    {/* Live Screening State Indicator Banner */}
                    <div className={`m4-voice-status-banner ${screeningState === 'recording' ? 'm4-banner-recording' : 'm4-banner-ready'}`}>
                        <div className="flex items-center gap-3">
                            <span
                                className={`m4-pulse-dot ${screeningState === 'recording' ? 'bg-red-500' : 'bg-emerald-500'}`}
                                style={{ transform: screeningState === 'recording' ? `scale(${1 + (audioLevel / 100) * 0.5})` : undefined }}
                            />
                            <div>
                                <span className="font-bold text-sm block sm:inline">
                                    {screeningState === 'recording' ? '🎙️ Microphone Live — Speak your answer' : 'Ready to record candidate response'}
                                </span>
                                <span className="text-xs opacity-80 sm:ml-3 block sm:inline">
                                    Question {currentQNum} of {totalQCount}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mt-2 sm:mt-0">
                            {/* Live Timer */}
                            <div className="tabular-nums font-bold text-base flex items-center gap-1.5">
                                ⏱️ {formatTime(timerSeconds)}
                            </div>

                            {/* Reactive Real-Time Audio Level Waveform */}
                            <div
                                className="m4-waveform-container"
                                title={screeningState === 'recording' ? `Mic volume: ${audioLevel}%` : 'Audio input idle'}
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => {
                                    // Scale height based on actual audioLevel if recording
                                    const baseHeight = 6;
                                    const dynamicHeight = screeningState === 'recording'
                                        ? Math.max(6, Math.min(28, (audioLevel * (0.4 + (i % 4) * 0.18)) + Math.random() * 4))
                                        : baseHeight;
                                    return (
                                        <div
                                            key={i}
                                            className={`m4-wave-bar ${screeningState === 'recording' ? 'active' : ''}`}
                                            style={{
                                                height: `${dynamicHeight}px`,
                                                backgroundColor: screeningState === 'recording' ? (audioLevel > 15 ? '#ef4444' : '#f87171') : '#cbd5e1',
                                                transition: 'height 0.08s ease, background-color 0.15s ease'
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Question Box with Live Karaoke Word Synchronization */}
                    {activeQuestion && (
                        <div className="m4-question-box">
                            <div className="m4-question-header flex flex-wrap items-center justify-between gap-2">
                                <span className="m4-question-num">
                                    Question {currentQNum} of {totalQCount} • {activeQuestion.type?.toUpperCase()}
                                </span>
                                <button
                                    className="m4-btn m4-btn-secondary py-1 px-2.5 text-xs flex items-center gap-1.5"
                                    onClick={() => speakQuestion(activeQuestion.question)}
                                    title="Replay Question Audio"
                                >
                                    <Volume2 className={`w-3.5 h-3.5 ${isSpeakingQuestion ? 'text-indigo-500 animate-pulse' : ''}`} />
                                    {isSpeakingQuestion ? 'Speaking...' : 'Replay Audio'}
                                </button>
                            </div>

                            {/* Spoken Audio Live Indicator */}
                            {isSpeakingQuestion && (
                                <div className="lively-ai-speaking-indicator">
                                    <Volume2 className="w-4 h-4 text-indigo-400 animate-bounce" />
                                    <span>AI Interviewer Speaking: Hearing words live in real time...</span>
                                    <div className="lively-audio-mini-meter">
                                        <div className="lively-audio-meter-fill animate-pulse" style={{ width: '85%' }}></div>
                                    </div>
                                </div>
                            )}

                            {/* Question text with word-by-word karaoke highlight */}
                            <div className="lively-question-text" id="live-heard-question-area" style={{ margin: '0.85rem 0' }}>
                                {questionWords && questionWords.length > 0 ? (
                                    questionWords.map((word, idx) => {
                                        const isSpeakingThis = idx === spokenWordIndex;
                                        const hasBeenSpoken = spokenWordIndex > idx;
                                        return (
                                            <span
                                                key={idx}
                                                className={`lively-word ${isSpeakingThis ? 'lively-word-speaking' : ''} ${hasBeenSpoken ? 'lively-word-heard' : ''}`}
                                            >
                                                {word}{' '}
                                            </span>
                                        );
                                    })
                                ) : (
                                    <span>"{activeQuestion.question}"</span>
                                )}
                            </div>

                            <div className="flex gap-2 flex-wrap items-center mt-2">
                                <span className="text-xs text-gray-500 font-semibold">Expected Key Focus:</span>
                                {(activeQuestion.expected_focus || []).map((f, i) => (
                                    <span key={i} className="m4-skill-pill">
                                        {f}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Dedicated Real-Time Live Speech Projection Monitor */}
                    <div
                        className={`lively-speech-monitor-box ${isListening || screeningState === 'recording' ? 'lively-monitor-active' : ''}`}
                        id="live-speech-transcription-screen"
                    >
                        <div className="lively-speech-monitor-header">
                            <div className="flex items-center gap-2.5">
                                <span className={isListening || screeningState === 'recording' ? 'lively-pulse-red' : 'w-2.5 h-2.5 rounded-full bg-slate-500'} />
                                <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                                    {isListening || screeningState === 'recording' ? '🔴 Live Microphone Transcribing' : '🎙️ Candidate Speech Transcription Stream'}
                                </span>
                                {isListening && (
                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                                        Transcribing Live
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-400 font-mono">
                                    {transcript ? `${transcript.trim().split(/\s+/).filter(Boolean).length} words` : '0 words'}
                                </span>
                                <div className="lively-audio-mini-meter" title={`Mic volume: ${audioLevel}%`}>
                                    <div
                                        className="lively-audio-meter-fill"
                                        style={{ width: `${Math.min(100, Math.max(8, audioLevel * 2.2))}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Real-Time Words Display */}
                        <div className="lively-speech-stream-display">
                            {transcript ? (
                                <span className="lively-confirmed-text">{transcript} </span>
                            ) : null}

                            {interimText ? (
                                <span className="lively-interim-phrase">
                                    <span className="animate-spin text-xs">⚡</span>
                                    {interimText}
                                </span>
                            ) : null}

                            {(isListening || screeningState === 'recording') && (
                                <span className="lively-cursor" />
                            )}

                            {!transcript && !interimText && (
                                <div className="lively-empty-hint">
                                    {screeningState === 'recording'
                                        ? '🎙️ Speaking now... Your words appear here in real time with live speech recognition!'
                                        : 'Click "Start Voice Input" or speak — your words will be converted lively into text in this area.'}
                                </div>
                            )}
                        </div>

                        {/* Real-time Hearing confirmation pill */}
                        {interimText && (
                            <div className="lively-hearing-pill">
                                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                                    🗣️ Hearing you live:
                                </span>
                                <span className="text-xs text-sky-200 font-medium italic">
                                    "{interimText}"
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Lively Audio-to-Text Converting Animation */}
                    <VoiceConvertingIndicator
                        isListening={isListening}
                        isConverting={isConverting}
                        isSpeaking={isSpeaking}
                        audioLevel={audioLevel}
                        interimText={interimText}
                        targetLabel="Candidate Answer"
                    />

                    {/* Candidate Answer Box */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-1.5 flex-wrap gap-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <span>📝 Candidate Answer (Live Speech-to-Text):</span>
                                {isListening && (
                                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                                        ● Live Speech Active
                                    </span>
                                )}
                            </label>
                            <span className="text-xs text-slate-500">
                                {screeningState === 'recording' ? '🎤 Speaking... Text is lively placed into the answer box below' : 'Spoken words populate directly into answer box (editable)'}
                            </span>
                        </div>
                        <div className="relative">
                            <textarea
                                className={`m4-transcript-box w-full ${isListening ? 'm4-transcript-box-active' : ''}`}
                                value={transcript}
                                onChange={(e) => {
                                    setTranscript(e.target.value);
                                    resetTranscript(e.target.value);
                                }}
                                placeholder={screeningState === 'recording' ? "Listening... Your spoken words are being lively converted and placed here in real time as you speak." : "Click 'Start Voice Input' and speak your answer, or type directly here."}
                                rows={4}
                            />
                            {screeningState === 'recording' && (
                                <div className="absolute top-3 right-3 flex items-center gap-2 bg-slate-900/90 text-white px-3 py-1 rounded-full text-xs font-bold border border-indigo-500/40 shadow-lg">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                                    {isConverting ? (
                                        <span className="text-emerald-400 flex items-center gap-1">
                                            <RefreshCw className="w-3 h-3 animate-spin" /> Converting Speech Lively...
                                        </span>
                                    ) : (
                                        <span className="text-indigo-300">🎙️ Mic Active — Speak Answer</span>
                                    )}
                                </div>
                            )}

                            {/* Lively Bottom Info Ribbon */}
                            {isListening && (
                                <div className="voice-textarea-live-footer flex items-center justify-between mt-2 px-3 py-1.5 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="voice-dot-ping" style={{ backgroundColor: isConverting ? '#10b981' : '#818cf8' }} />
                                        <span className="font-semibold text-indigo-300">
                                            {isConverting ? '⟳ Converting audio into text in real-time...' : '🎙️ Microphone listening — speak your response'}
                                        </span>
                                    </div>
                                    {interimText && (
                                        <span className="text-sky-300 italic font-medium truncate max-w-[220px]">
                                            "{interimText}"
                                        </span>
                                    )}
                                    <span className="text-slate-400 font-mono">
                                        {transcript ? `${transcript.trim().split(/\s+/).filter(Boolean).length} words` : '0 words'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Controls Toolbar */}
                    <div className="voice-controls-toolbar">
                        <div className="flex gap-2.5 flex-wrap">
                            {screeningState !== 'recording' ? (
                                <button
                                    className="m4-btn m4-btn-primary flex items-center gap-2"
                                    onClick={handleStartRecording}
                                    title="Activate microphone and speak response"
                                >
                                    <Mic className="w-4 h-4" /> Start Voice Input
                                </button>
                            ) : (
                                <button
                                    className="m4-btn m4-btn-danger flex items-center gap-2"
                                    onClick={handleStopRecording}
                                    title="Pause microphone recording"
                                >
                                    <Square className="w-4 h-4" /> Stop Recording
                                </button>
                            )}

                            <button
                                className="m4-btn m4-btn-secondary flex items-center gap-1.5"
                                onClick={() => {
                                    setScreeningState('recording');
                                    simulateVoiceInput("I have extensive experience with full-stack development, optimizing state management, and delivering robust AI-driven features.");
                                }}
                                title="Simulate speech-to-text conversion to test loading animation"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Test Voice Conversion
                            </button>

                            <button
                                className="m4-btn m4-btn-secondary flex items-center gap-1.5"
                                onClick={() => {
                                    if (window.confirm('Clear current transcript text?')) {
                                        setTranscript('');
                                        resetTranscript('');
                                    }
                                }}
                                disabled={!transcript}
                                title="Clear current transcript"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Clear
                            </button>
                        </div>

                        <div className="flex gap-2.5">
                            <button
                                className="m4-btn m4-btn-success flex items-center gap-2"
                                onClick={handleSubmitCurrentAnswer}
                                disabled={screeningState === 'submitting'}
                            >
                                {screeningState === 'submitting' ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" /> Evaluating...
                                    </>
                                ) : currentQNum < totalQCount ? (
                                    <>
                                        Next Question <ArrowRight className="w-4 h-4" />
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" /> Save & Finalize Assessment
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* COMPLETED ASSESSMENT REPORT */}
            {screeningState === 'completed' && assessmentReport && (
                <div className="voice-report-card">
                    <div className="voice-report-header">
                        <div>
                            <span className="m4-badge m4-badge-screened mb-2">
                                Screening Completed
                            </span>
                            <h3 className="voice-report-title">
                                Preliminary Screening Assessment Report
                            </h3>
                            <p className="voice-report-subtitle">
                                Candidate: <strong>{assessmentReport.candidate_name}</strong> • Role: <strong>{assessmentReport.job_title}</strong>
                            </p>
                        </div>

                        {/* Overall Score Badge */}
                        <div className="voice-score-pill">
                            <div className="voice-score-label">
                                Overall Score
                            </div>
                            <div
                                className="voice-score-val"
                                style={{
                                    color: assessmentReport.overall_score >= 75 ? '#059669' : assessmentReport.overall_score >= 60 ? '#d97706' : '#dc2626'
                                }}
                            >
                                {assessmentReport.overall_score}%
                            </div>
                        </div>
                    </div>

                    {/* Workflow Recommendation Banner */}
                    <div
                        className="voice-recommendation-box"
                        style={{
                            backgroundColor: assessmentReport.overall_score >= 75 ? '#ecfdf5' : assessmentReport.overall_score >= 60 ? '#fffbeb' : '#fef2f2',
                            borderColor: assessmentReport.overall_score >= 75 ? '#a7f3d0' : assessmentReport.overall_score >= 60 ? '#fef3c7' : '#fecaca'
                        }}
                    >
                        <div>
                            <span className="text-xs font-bold uppercase text-slate-500 block">
                                Recommended Action
                            </span>
                            <div
                                className="text-lg font-extrabold mt-0.5"
                                style={{
                                    color: assessmentReport.overall_score >= 75 ? '#065f46' : assessmentReport.overall_score >= 60 ? '#92400e' : '#991b1b'
                                }}
                            >
                                {assessmentReport.recommendation}
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                                {assessmentReport.action_note}
                            </div>
                        </div>
                        <Award className={`w-8 h-8 flex-shrink-0 ${assessmentReport.overall_score >= 75 ? 'text-emerald-600' : assessmentReport.overall_score >= 60 ? 'text-amber-600' : 'text-rose-600'}`} />
                    </div>

                    {/* 5-Dimensional Competency Breakdown (Responsive Grid) */}
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
                        Evaluated Competency Dimensions
                    </h4>
                    <div className="voice-dimensions-grid">
                        {[
                            { label: 'Technical Knowledge', value: assessmentReport.dimension_breakdown?.technical_knowledge || 0 },
                            { label: 'Response Relevance', value: assessmentReport.dimension_breakdown?.response_relevance || 0 },
                            { label: 'Communication Clarity', value: assessmentReport.dimension_breakdown?.communication_clarity || 0 },
                            { label: 'Completeness', value: assessmentReport.dimension_breakdown?.completeness || 0 },
                            { label: 'Role Knowledge', value: assessmentReport.dimension_breakdown?.role_knowledge || 0 },
                        ].map((dim, i) => (
                            <div key={i} className="voice-dimension-card">
                                <div className="voice-dim-label">
                                    {dim.label}
                                </div>
                                <div className="voice-dim-val">
                                    {dim.value}%
                                </div>
                                <div className="voice-dim-track">
                                    <div
                                        className="voice-dim-fill"
                                        style={{
                                             width: `${dim.value}%`,
                                             backgroundColor: dim.value >= 75 ? '#10b981' : dim.value >= 60 ? '#f59e0b' : '#ef4444'
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Explicit Mathematical Calculation & Scoring Rubric Proof */}
                    <div style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '1rem 1.25rem',
                        marginTop: '1.25rem',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
                                    🧮 Transparent Mathematical Calculation & Rubric Proof
                                </span>
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '9999px',
                                    backgroundColor: assessmentReport.overall_score >= 75 ? '#dcfce7' : assessmentReport.overall_score >= 60 ? '#fef3c7' : '#fee2e2',
                                    color: assessmentReport.overall_score >= 75 ? '#15803d' : assessmentReport.overall_score >= 60 ? '#b45309' : '#b91c1c'
                                }}>
                                    {assessmentReport.recommendation}
                                </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Weights: 30% Tech • 25% Relevance • 20% Comm • 15% Completeness • 10% Role
                            </span>
                        </div>

                        {/* Formula Display */}
                        <div style={{
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '0.65rem 0.85rem',
                            color: '#0f172a',
                            marginBottom: '0.75rem',
                            overflowX: 'auto',
                            lineHeight: 1.6
                        }}>
                            <div>
                                <strong>Formula: </strong>
                                Overall Score = (0.30 × Tech) + (0.25 × Relevance) + (0.20 × Comm) + (0.15 × Completeness) + (0.10 × Role)
                            </div>
                            <div style={{ color: '#2563eb', marginTop: '0.25rem' }}>
                                <strong>Proof: </strong>
                                (0.30 × {assessmentReport.dimension_breakdown?.technical_knowledge || 0}%) + (0.25 × {assessmentReport.dimension_breakdown?.response_relevance || 0}%) + (0.20 × {assessmentReport.dimension_breakdown?.communication_clarity || 0}%) + (0.15 × {assessmentReport.dimension_breakdown?.completeness || 0}%) + (0.10 × {assessmentReport.dimension_breakdown?.role_knowledge || 0}%) = <strong>{assessmentReport.overall_score}%</strong>
                            </div>
                        </div>

                        {/* Thresholds & Rule Justification */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.75rem' }}>
                            <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: assessmentReport.overall_score >= 75 ? '#dcfce7' : '#f1f5f9', border: `1px solid ${assessmentReport.overall_score >= 75 ? '#86efac' : '#e2e8f0'}` }}>
                                <strong style={{ color: '#15803d' }}>≥ 75% Proceed to Next Round:</strong>
                                <p style={{ margin: '2px 0 0 0', color: '#334155' }}>Meets high technical fluency and communication criteria for interview shortlist.</p>
                            </div>
                            <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: (assessmentReport.overall_score >= 60 && assessmentReport.overall_score < 75) ? '#fef3c7' : '#f1f5f9', border: `1px solid ${(assessmentReport.overall_score >= 60 && assessmentReport.overall_score < 75) ? '#fcd34d' : '#e2e8f0'}` }}>
                                <strong style={{ color: '#b45309' }}>60% – 74.9% Requires Further Review:</strong>
                                <p style={{ margin: '2px 0 0 0', color: '#334155' }}>Competent foundation with moderate depth gaps; manual interviewer review advised.</p>
                            </div>
                            <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: assessmentReport.overall_score < 60 ? '#fee2e2' : '#f1f5f9', border: `1px solid ${assessmentReport.overall_score < 60 ? '#fca5a5' : '#e2e8f0'}` }}>
                                <strong style={{ color: '#b91c1c' }}>&lt; 60% Do Not Proceed:</strong>
                                <p style={{ margin: '2px 0 0 0', color: '#334155' }}>Sub-threshold response completeness or technical mismatch for target role.</p>
                            </div>
                        </div>
                    </div>

                    {/* Spoken Responses & Transcripts */}
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
                        Oral Questions & Verified Transcripts
                    </h4>
                    <div className="flex flex-col gap-3 mb-6">
                        {(assessmentReport.responses || []).map((resp, i) => (
                            <div key={i} className="voice-response-card">
                                <div className="flex justify-between items-center mb-1.5 flex-wrap gap-1">
                                    <span className="text-xs font-bold text-indigo-600">
                                        Q{i + 1}: {resp.skill}
                                    </span>
                                    <span className={`text-xs font-bold ${resp.score >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        Score: {resp.score}%
                                    </span>
                                </div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                                    "{resp.question}"
                                </div>
                                <div className="voice-transcript-snippet">
                                    <strong className="text-slate-500">Candidate Spoken Response: </strong>
                                    {resp.candidate_response}
                                </div>
                                {resp.evaluation?.feedback && (
                                    <div className="text-xs text-slate-500 mt-1.5 italic">
                                        Evaluation Feedback: {resp.evaluation.feedback}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Permanent Storage Confirmation Notice */}
                    <div className="voice-storage-notice">
                        ✓ {assessmentReport.recording_storage_note || 'Session transcript and evaluations are permanently stored in database. Candidate profile updated to Screened.'}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            className="m4-btn m4-btn-primary"
                            onClick={() => {
                                setSession(null);
                                setScreeningState('idle');
                                setTranscript('');
                                resetTranscript('');
                                setTimerSeconds(0);
                            }}
                        >
                            {isCandidateMode ? 'Take Another Voice Test' : 'Screen Another Candidate'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
