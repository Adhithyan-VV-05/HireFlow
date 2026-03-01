import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import SkillTag from '../components/SkillTag';
import ScoreBar from '../components/ScoreBar';
import ResumeViewer from '../components/ResumeViewer';

export default function InterviewerPortal() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('jobs');

    // Jobs state
    const [jobs, setJobs] = useState([]);
    const [jobTitle, setJobTitle] = useState('');
    const [jobDesc, setJobDesc] = useState('');
    const [jobSkills, setJobSkills] = useState('');
    const [jobDeadline, setJobDeadline] = useState('');
    const [creatingJob, setCreatingJob] = useState(false);

    // Search state
    const [selectedJob, setSelectedJob] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [fairness, setFairness] = useState(null);

    // Global Candidate State
    const [allCandidates, setAllCandidates] = useState([]);
    const [allCandidatesLoading, setAllCandidatesLoading] = useState(false);

    // Scheduling state
    const [schedulingCandidate, setSchedulingCandidate] = useState(null);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [isScheduling, setIsScheduling] = useState(false);
    const [schedulingProgress, setSchedulingProgress] = useState(0);
    const [schedulingStatus, setSchedulingStatus] = useState('');

    // Interviews State (Unified)
    const [scheduledInterviews, setScheduledInterviews] = useState([]);
    const [loadingScheduled, setLoadingScheduled] = useState(false);

    // Applications state
    const [applications, setApplications] = useState([]);
    const [loadingApps, setLoadingApps] = useState(false);

    // Resume Viewer state
    const [viewingResume, setViewingResume] = useState(null);

    useEffect(() => {
        fetchJobs();
        fetchScheduledInterviews();
        fetchAllCandidates();
        fetchApplications();
    }, []);

    const fetchAllCandidates = async () => {
        setAllCandidatesLoading(true);
        try {
            const data = await api.listCandidates();
            const sorted = (data.candidates || []).sort((a, b) =>
                (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
            );
            setAllCandidates(sorted);
        } catch (err) {
            console.error('[RecruiterPortal] Failed to fetch candidates:', err);
        } finally {
            setAllCandidatesLoading(false);
        }
    };

    const fetchScheduledInterviews = async () => {
        setLoadingScheduled(true);
        try {
            const data = await api.getScheduledInterviews();
            setScheduledInterviews(data || []);
        } catch (err) { console.error(err); }
        finally { setLoadingScheduled(false); }
    };

    const fetchJobs = async () => {
        try {
            const data = await api.listJobs();
            setJobs(data.jobs || []);
        } catch (err) { console.error(err); }
    };

    const fetchApplications = async () => {
        setLoadingApps(true);
        try {
            const data = await api.listJobApplications();
            setApplications(data.applications || []);
        } catch (err) { console.error(err); }
        finally { setLoadingApps(false); }
    };

    const createJob = async (e) => {
        e.preventDefault();
        setCreatingJob(true);
        try {
            const skills = jobSkills.split(',').map(s => s.trim()).filter(Boolean);
            await api.createJob({
                title: jobTitle,
                description: jobDesc,
                required_skills: skills,
                deadline: jobDeadline
            });
            setJobTitle(''); setJobDesc(''); setJobSkills(''); setJobDeadline('');
            fetchJobs();
        } catch (err) { alert(err.message); }
        finally { setCreatingJob(false); }
    };

    const searchCandidates = async (job) => {
        setSelectedJob(job);
        setSearching(true);
        setActiveTab('candidates');
        try {
            const data = await api.matchCandidates({
                job_description: `${job.title}\n${job.description}`,
                top_k: 10,
            });
            setSearchResults(data.candidates || []);
            setFairness(data.fairness || null);
        } catch (err) { alert(err.message); }
        finally { setSearching(false); }
    };

    const handleScheduleInterview = async () => {
        if (!schedulingCandidate || !scheduleDate || !scheduleTime) return;

        setIsScheduling(true);
        setSchedulingProgress(10);
        setSchedulingStatus('Verifying details...');

        const interval = setInterval(() => {
            setSchedulingProgress(prev => {
                if (prev >= 90) return prev;
                return prev + 5;
            });
        }, 800);

        try {
            const scheduledAt = `${scheduleDate}T${scheduleTime}:00`;
            setSchedulingStatus('AI generating interview email...');

            await api.scheduleInterview({
                candidate_id: schedulingCandidate.id,
                job_id: selectedJob?.id || 'general',
                scheduled_at: scheduledAt,
                is_video_call: true
            });

            setSchedulingProgress(100);
            setSchedulingStatus('Email dispatched successfully!');
            clearInterval(interval);

            setTimeout(() => {
                alert('Interview scheduled and email sent successfully!');
                setSchedulingCandidate(null);
                setScheduleDate('');
                setScheduleTime('');
                setSchedulingProgress(0);
                setSchedulingStatus('');
                fetchScheduledInterviews();
            }, 500);

        } catch (err) {
            clearInterval(interval);
            alert(err.message || 'Failed to schedule interview');
        } finally {
            setIsScheduling(false);
        }
    };

    return (
        <div className="portal">
            <header className="portal-header">
                <div className="portal-header-left">
                    <span className="logo-icon">⚡</span>
                    <span className="portal-title">HireFlow AI</span>
                    <span className="portal-badge interviewer-badge">Interviewer</span>
                </div>
                <div className="portal-header-right">
                    <span className="portal-user">👤 {user?.name}</span>
                    <button onClick={logout} className="logout-btn">Logout</button>
                </div>
            </header>

            <nav className="portal-tabs">
                <button className={`tab-btn ${activeTab === 'jobs' ? 'active' : ''}`} onClick={() => setActiveTab('jobs')}>
                    💼 Jobs
                </button>
                <button className={`tab-btn ${activeTab === 'candidates' ? 'active' : ''}`} onClick={() => setActiveTab('candidates')}>
                    👥 Candidates
                </button>
                <button className={`tab-btn ${activeTab === 'interviews' ? 'active' : ''}`} onClick={() => setActiveTab('interviews')}>
                    🎙️ Interviews
                </button>
                <button className={`tab-btn ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => setActiveTab('applications')}>
                    📥 Applications
                </button>
            </nav>

            <main className="portal-content">
                {/* INTERVIEWS TAB */}
                {activeTab === 'interviews' && (
                    <div className="portal-section">
                        <div className="section-header">
                            <h2>🎙️ Interview Management</h2>
                            <button className="action-btn ghost-btn" onClick={fetchScheduledInterviews}>🔄 Refresh</button>
                        </div>

                        {loadingScheduled && (
                            <div className="loading-state">
                                <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
                                <p>Loading interviews...</p>
                            </div>
                        )}

                        {!loadingScheduled && scheduledInterviews.length === 0 && (
                            <div className="empty-state">
                                <span className="empty-icon">🎙️</span>
                                <p>No scheduled, pending, or conducted interviews found.</p>
                            </div>
                        )}

                        <div className="cards-grid">
                            {scheduledInterviews.map((iv) => (
                                <div key={iv.id} className="card glass-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div>
                                            <h3 className="card-title" style={{ margin: 0 }}>{iv.candidate_name}</h3>
                                            <p style={{ fontSize: '0.85rem', color: '#888' }}>
                                                {iv.is_video_call ? '🎥 Video Interview' : '🎙️ AI Screening'}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span
                                                className="status-badge"
                                                style={{
                                                    background: iv.schedule_status === 'accepted' ? '#10b981' : iv.schedule_status === 'skipped' ? '#ef4444' : '#6366f1',
                                                    color: 'white',
                                                    padding: '0.25rem 0.6rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.7rem',
                                                    textTransform: 'uppercase',
                                                    fontWeight: '700'
                                                }}
                                            >
                                                {iv.schedule_status || iv.status || 'pending'}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 12, marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                            <span>📅</span> <strong>{iv.scheduled_at ? new Date(iv.scheduled_at).toLocaleDateString() : 'N/A'}</strong>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                            <span>⏰</span> <strong>{iv.scheduled_at ? new Date(iv.scheduled_at).toLocaleTimeString() : 'N/A'}</strong>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        {iv.is_video_call ? (
                                            <button
                                                className="action-btn primary-btn"
                                                style={{
                                                    flex: 1,
                                                    background: iv.schedule_status === 'accepted' ? '#6366f1' : '#334155',
                                                    opacity: iv.schedule_status === 'accepted' ? 1 : 0.6,
                                                    cursor: iv.schedule_status === 'accepted' ? 'pointer' : 'not-allowed'
                                                }}
                                                onClick={() => iv.schedule_status === 'accepted' && window.location.assign(`/video-interview/${iv.id}`)}
                                                disabled={iv.schedule_status !== 'accepted'}
                                            >
                                                {iv.schedule_status === 'accepted' ? 'Join Call' : 'Awaiting Confirmation'}
                                            </button>
                                        ) : (
                                            <button className="action-btn secondary-btn" style={{ flex: 1 }}>
                                                📈 View AI Transcript
                                            </button>
                                        )}
                                        <button className="action-btn ghost-btn" style={{ padding: '0 1rem' }} onClick={() => alert('Feature coming soon: View detailed analysis')}>
                                            📋 Result
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* JOBS TAB */}
                {activeTab === 'jobs' && (
                    <div className="portal-section">
                        <div className="section-header">
                            <h2>📋 Job Postings</h2>
                        </div>
                        <div className="card glass-card">
                            <h3 className="card-title">Create New Job</h3>
                            <form onSubmit={createJob} className="create-job-form">
                                <div className="form-group">
                                    <label className="form-label">Job Title</label>
                                    <input className="form-input" placeholder="e.g. Senior React Developer"
                                        value={jobTitle} onChange={e => setJobTitle(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea className="form-input form-textarea" rows={4}
                                        placeholder="Job description and requirements..."
                                        value={jobDesc} onChange={e => setJobDesc(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Required Skills (comma-separated)</label>
                                    <input className="form-input" placeholder="React, Node.js, TypeScript"
                                        value={jobSkills} onChange={e => setJobSkills(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">📅 Application Deadline</label>
                                    <input type="date" className="form-input"
                                        value={jobDeadline} onChange={e => setJobDeadline(e.target.value)} />
                                </div>
                                <button type="submit" className="action-btn primary-btn" disabled={creatingJob}>
                                    {creatingJob ? 'Creating...' : '+ Create Job Posting'}
                                </button>
                            </form>
                        </div>

                        <div className="cards-grid">
                            {jobs.map(job => (
                                <div key={job.id} className="card glass-card job-card">
                                    <h3 className="card-title">{job.title}</h3>
                                    <p className="card-desc">{job.description?.substring(0, 150)}...</p>
                                    <div className="skill-tags">
                                        {job.required_skills?.map((skill, i) => (
                                            <SkillTag key={i} skill={skill} />
                                        ))}
                                    </div>
                                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                                            👤 Posted by: <span style={{ color: 'white' }}>{job.owner_name}</span>
                                        </div>
                                        {job.deadline && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--rose-400)' }}>
                                                📅 Deadline: {new Date(job.deadline).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                    <button className="action-btn secondary-btn" style={{ marginTop: '1rem' }} onClick={() => searchCandidates(job)}>
                                        🔍 Find Candidates
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CANDIDATES TAB */}
                {activeTab === 'candidates' && (
                    <div className="portal-section">
                        <div className="section-header">
                            <h2>👥 {selectedJob ? `Matches for "${selectedJob.title}"` : 'Candidate Search'}</h2>
                            {selectedJob && (
                                <button className="action-btn ghost-btn" onClick={() => { setSelectedJob(null); setSearchResults([]); }}>
                                    ← Back to all jobs
                                </button>
                            )}
                        </div>

                        {searching && (
                            <div className="loading-state">
                                <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
                                <p>Searching and ranking candidates...</p>
                            </div>
                        )}

                        {!searching && searchResults.length > 0 && (
                            <div className="candidate-list">
                                {fairness && fairness.warnings?.length > 0 && (
                                    <div className="fairness-box">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fbbf24', fontWeight: 800, fontSize: '0.9rem' }}>
                                            <span>⚠️ AI Fairness Notice:</span>
                                        </div>
                                        {fairness.warnings.map((w, i) => (
                                            <p key={i} style={{ fontSize: '0.85rem', color: 'var(--gray-300)', margin: 0 }}>• {w}</p>
                                        ))}
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--gray-500)', fontStyle: 'italic' }}>
                                            The ranking algorithm is strictly limited to skill and experience overlap. Protected attributes are excluded from analysis.
                                        </div>
                                    </div>
                                )}

                                {searchResults.map((candidate, idx) => {
                                    const explain = fairness?.explainability?.[idx];
                                    const rankClass = idx === 0 ? 'match-rank-gold' : idx === 1 ? 'match-rank-silver' : idx === 2 ? 'match-rank-bronze' : '';

                                    return (
                                        <div key={idx} className="card glass-card match-card-premium">
                                            <div className={`match-rank-badge ${rankClass}`}>
                                                {idx + 1}
                                            </div>

                                            <div className="candidate-header" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                                <div className="candidate-rank" style={{ width: 60, height: 60, fontSize: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 12 }}>
                                                    {(candidate.name || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="candidate-name" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{candidate.name}</h3>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <span className="candidate-email" style={{ fontSize: '0.9rem' }}>{candidate.email}</span>
                                                        <div className="match-score-pill">
                                                            <span className="match-score-value">{((candidate.final_score || 0) * 100).toFixed(0)}%</span>
                                                            <span className="match-score-label">Match Score</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {explain && (
                                                <div className="score-breakdown-details">
                                                    <div className="breakdown-stat">
                                                        <label>🔍 Semantic Relevance</label>
                                                        <span>{((explain.search_relevance || 0) * 100).toFixed(0)}%</span>
                                                    </div>
                                                    <div className="breakdown-stat">
                                                        <label>🛠️ Skill Match</label>
                                                        <span>{((explain.skill_match_ratio || 0) * 100).toFixed(0)}%</span>
                                                    </div>
                                                    <div className="breakdown-stat">
                                                        <label>🎯 Precision Score</label>
                                                        <span>{((explain.dense_similarity || explain.keyword_match || 0) * 100).toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="skill-gap-analysis">
                                                <div className="skill-set-group">
                                                    <h4>✅ Matched Expertise <span>({candidate.matched_skills?.length || 0})</span></h4>
                                                    <div className="skill-tags">
                                                        {candidate.matched_skills?.map((skill, i) => (
                                                            <SkillTag key={i} skill={skill} className="matched-pill" />
                                                        ))}
                                                        {(!candidate.matched_skills || candidate.matched_skills.length === 0) && <p className="muted-text" style={{ fontSize: '0.8rem' }}>No direct keyword matches.</p>}
                                                    </div>
                                                </div>
                                                <div className="skill-set-group">
                                                    <h4>❌ Missing Requirements <span>({candidate.missing_skills?.length || 0})</span></h4>
                                                    <div className="skill-tags">
                                                        {candidate.missing_skills?.slice(0, 8).map((skill, i) => (
                                                            <SkillTag key={i} skill={skill} className="missing-pill" />
                                                        ))}
                                                        {(!candidate.missing_skills || candidate.missing_skills.length === 0) && <p style={{ fontSize: '0.8rem', color: 'var(--accent-400)' }}>Perfect skill overlap detected.</p>}
                                                    </div>
                                                </div>
                                            </div>

                                            {candidate.aptitude_scores && Object.keys(candidate.aptitude_scores).length > 0 && (
                                                <div className="aptitude-preview">
                                                    <div className="aptitude-header">
                                                        <span>📊 AI Behavioral & Aptitude Assessment</span>
                                                        <span style={{ color: 'var(--gray-500)', fontSize: '0.75rem' }}>*Scores from technical screenings</span>
                                                    </div>
                                                    <div className="aptitude-mini-grid">
                                                        {Object.entries(candidate.aptitude_scores).map(([label, val]) => {
                                                            const colorClass = val >= 0.8 ? 'apt-val-high' : val >= 0.6 ? 'apt-val-mid' : 'apt-val-low';
                                                            return (
                                                                <div key={label} className="aptitude-mini-item">
                                                                    <span style={{ color: 'var(--gray-400)' }}>{label}</span>
                                                                    <span className={colorClass}>{(val * 100).toFixed(0)}%</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="card-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                                                <button className="hub-btn hub-btn-secondary" style={{ padding: '0.75rem 1.5rem' }}
                                                    onClick={() => setViewingResume({
                                                        file_name: `${candidate.name}_Resume.pdf`,
                                                        url: api.getLatestResumeUrl(candidate.candidate_id || candidate.id)
                                                    })}>
                                                    👁️ View Resume
                                                </button>
                                                <button className="hub-btn hub-btn-primary" style={{ padding: '0.75rem 2rem' }}
                                                    onClick={() => setSchedulingCandidate({ id: candidate.candidate_id, name: candidate.name })}>
                                                    Schedule Video Interview ➔
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {!searching && !selectedJob && (
                            <div className="candidate-list">
                                {allCandidatesLoading ? (
                                    <p>Loading candidates...</p>
                                ) : (
                                    allCandidates.map((candidate, idx) => (
                                        <div key={idx} className="card glass-card candidate-card-row">
                                            <div className="candidate-info">
                                                <div className="candidate-rank" style={{ background: '#475569' }}>AZ</div>
                                                <div>
                                                    <h3 className="candidate-name">{candidate.name || candidate.id}</h3>
                                                    <p className="candidate-email">{candidate.email || ''}</p>
                                                    <div className="skill-tags" style={{ marginTop: '0.5rem' }}>
                                                        {(candidate.skills || []).map((skill, i) => (
                                                            <SkillTag key={i} skill={skill} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="candidate-actions">
                                                <button className="action-btn ghost-btn" style={{ marginRight: '0.5rem' }}
                                                    onClick={() => setViewingResume({
                                                        file_name: `${candidate.name}_Resume.pdf`,
                                                        url: api.getLatestResumeUrl(candidate.id)
                                                    })}>
                                                    👁️ Resume
                                                </button>
                                                <button className="action-btn primary-btn"
                                                    onClick={() => setSchedulingCandidate(candidate)}>
                                                    📅 Schedule
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* APPLICATIONS TAB */}
                {activeTab === 'applications' && (
                    <div className="portal-section">
                        <div className="section-header">
                            <h2>📥 Incoming Applications</h2>
                            <button className="action-btn ghost-btn" onClick={fetchApplications}>🔄 Refresh</button>
                        </div>

                        {loadingApps ? (
                            <div className="loading-state">
                                <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
                                <p>Loading job applications...</p>
                            </div>
                        ) : applications.length === 0 ? (
                            <div className="empty-state">
                                <span className="empty-icon">📥</span>
                                <p>No applications received yet. Try posting more jobs or refining your requirements.</p>
                            </div>
                        ) : (
                            <div className="candidate-list">
                                {applications.map((app) => (
                                    <div key={app.id} className="card glass-card candidate-card-row" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '1.25rem' }}>
                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                <div className="candidate-rank" style={{ background: 'var(--primary-600)', borderRadius: '10px' }}>APP</div>
                                                <div>
                                                    <h3 className="candidate-name" style={{ margin: 0 }}>{app.candidate_name}</h3>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>{app.candidate_email}</span>
                                                        <span style={{ color: 'var(--gray-600)' }}>•</span>
                                                        <span style={{ fontSize: '0.85rem', color: 'var(--accent-400)', fontWeight: 600 }}>{app.job_title}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                                                Received: {new Date(app.created_at).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div className="app-review-container" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', width: '100%' }}>
                                            <div className="app-summary-section">
                                                <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)', marginBottom: '0.75rem' }}>📝 Professional Summary</h4>
                                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <p style={{ fontSize: '0.9rem', color: '#ccc', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{app.additional_details || "Self-applied through portal."}</p>
                                                </div>

                                                <div style={{ marginTop: '1.25rem' }}>
                                                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)', marginBottom: '0.75rem' }}>🔗 Links & Availability</h4>
                                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                                        {app.portfolio_url && (
                                                            <a href={app.portfolio_url} target="_blank" rel="noreferrer"
                                                                style={{ fontSize: '0.85rem', color: 'var(--primary-400)', textDecoration: 'none', background: 'rgba(99, 102, 241, 0.1)', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                                                🌐 Portfolio / LinkedIn ➔
                                                            </a>
                                                        )}
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--accent-400)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                                            🕒 Avail: {app.start_date || 'Immediate'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="app-skills-section">
                                                <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)', marginBottom: '0.75rem' }}>🛠️ Matched Skills</h4>
                                                <div className="skill-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    {app.candidate_skills?.map((s, i) => <SkillTag key={i} skill={s} />)}
                                                </div>
                                                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                    <button className="hub-btn hub-btn-secondary" style={{ width: '100%', border: '1px solid var(--accent-500)', background: 'rgba(99, 102, 241, 0.1)' }}
                                                        onClick={() => setViewingResume({
                                                            file_name: app.applied_resume_name || `${app.candidate_name}_Resume.pdf`,
                                                            url: api.getViewResumeUrl(app.applied_resume_id)
                                                        })}
                                                        disabled={!app.applied_resume_id}
                                                    >
                                                        📄 {app.applied_resume_name ? `View: ${app.applied_resume_name}` : 'View Attached Resume'}
                                                    </button>
                                                    <button className="action-btn primary-btn" style={{ width: '100%' }} onClick={() => setSchedulingCandidate({ id: app.candidate_id, name: app.candidate_name })}>
                                                        📅 Schedule Interview
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Scheduling Modal */}
            {schedulingCandidate && (
                <div className="modal-overlay">
                    <div className="modal-content glass-card card">
                        <div className="modal-header">
                            <h2 className="card-title">📅 Schedule Interview</h2>
                            <button className="close-btn" onClick={() => setSchedulingCandidate(null)}>×</button>
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <p style={{ color: '#aaa' }}>Candidate: <strong style={{ color: 'white' }}>{schedulingCandidate.name}</strong></p>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <input type="date" className="form-input" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ marginTop: '1rem' }}>
                            <label className="form-label">Time</label>
                            <input type="time" className="form-input" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                        </div>
                        <div className="modal-footer" style={{ marginTop: '2rem' }}>
                            <button className="action-btn primary-btn" style={{ width: '100%' }} onClick={handleScheduleInterview} disabled={isScheduling}>
                                {isScheduling ? 'Scheduling...' : 'Confirm Schedule'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Resume Viewer Modal */}
            <ResumeViewer
                isOpen={!!viewingResume}
                onClose={() => setViewingResume(null)}
                resumeUrl={viewingResume?.url}
                fileName={viewingResume?.file_name}
            />
        </div>
    );
}
