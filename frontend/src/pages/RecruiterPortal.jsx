import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import SkillTag from '../components/SkillTag';
import ScoreBar from '../components/ScoreBar';

export default function InterviewerPortal() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('jobs');

    // Jobs state
    const [jobs, setJobs] = useState([]);
    const [jobTitle, setJobTitle] = useState('');
    const [jobDesc, setJobDesc] = useState('');
    const [jobSkills, setJobSkills] = useState('');
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
            await api.createJob({ title: jobTitle, description: jobDesc, required_skills: skills });
            setJobTitle(''); setJobDesc(''); setJobSkills('');
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
                                <button type="submit" className="action-btn primary-btn" disabled={creatingJob}>
                                    {creatingJob ? 'Creating...' : '+ Create Job'}
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
                                    <button className="action-btn secondary-btn" onClick={() => searchCandidates(job)}>
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
                                {searchResults.map((candidate, idx) => (
                                    <div key={idx} className="card glass-card candidate-card-row">
                                        <div className="candidate-info">
                                            <div className="candidate-rank">#{idx + 1}</div>
                                            <div>
                                                <h3 className="candidate-name">{candidate.name || candidate.candidate_id}</h3>
                                                <p className="candidate-email">{candidate.email || ''}</p>
                                                <div className="match-score-display">
                                                    <span className="match-percentage">{((candidate.final_score || 0) * 100).toFixed(0)}% Match</span>
                                                </div>
                                                <div className="skill-tags" style={{ marginTop: '0.5rem' }}>
                                                    {candidate.matched_skills?.map((skill, i) => (
                                                        <SkillTag key={i} skill={skill} className="skill-matched" />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="candidate-actions">
                                            <button className="action-btn primary-btn"
                                                onClick={() => setSchedulingCandidate({ id: candidate.candidate_id, name: candidate.name })}>
                                                📅 Schedule an Interview
                                            </button>
                                        </div>
                                    </div>
                                ))}
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
                                                <button className="action-btn primary-btn"
                                                    onClick={() => setSchedulingCandidate(candidate)}>
                                                    📅 Schedule an Interview
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
                            <p>Loading applications...</p>
                        ) : (
                            <div className="candidate-list">
                                {applications.map((app) => (
                                    <div key={app.id} className="card glass-card candidate-card-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '1rem' }}>
                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                <div className="candidate-rank" style={{ background: 'var(--primary-600)' }}>APP</div>
                                                <div>
                                                    <h3 className="candidate-name" style={{ margin: 0 }}>{app.candidate_name}</h3>
                                                    <p style={{ fontSize: '0.85rem', color: 'var(--primary-300)', fontWeight: 600 }}>Applying for: {app.job_title}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ width: '100%', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
                                            <p style={{ fontSize: '0.9rem', color: '#ccc', whiteSpace: 'pre-wrap' }}>{app.additional_details || "No details provided."}</p>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                            <div className="skill-tags">
                                                {app.candidate_skills?.slice(0, 5).map((s, i) => <SkillTag key={i} skill={s} />)}
                                            </div>
                                            <button className="action-btn primary-btn small-btn" onClick={() => setSchedulingCandidate({ id: app.candidate_id, name: app.candidate_name })}>
                                                📅 Schedule an Interview
                                            </button>
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
        </div>
    );
}
