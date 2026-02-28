import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import SkillTag from '../components/SkillTag';
import ScoreBar from '../components/ScoreBar';
import CandidateCard from '../components/CandidateCard';
import AptitudeChatbot from './AptitudeChatbot';

export default function CandidatePortal() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    // Profile state
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);

    // Upload state
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef(null);

    // Interviews state (Unified)
    const [interviews, setInterviews] = useState([]); // AI Interviews
    const [scheduledInterviews, setScheduledInterviews] = useState([]); // Video Interviews/Offers
    const [interviewsLoading, setInterviewsLoading] = useState(false);

    // Active AI interview state
    const [activeSession, setActiveSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [interviewResult, setInterviewResult] = useState(null);

    // Upskilling state
    const [upskillingData, setUpskillingData] = useState(null);
    const [upskillingLoading, setUpskillingLoading] = useState(false);
    const [upskillingError, setUpskillingError] = useState('');
    const [selectedJobId, setSelectedJobId] = useState('');

    // Jobs state
    const [allJobs, setAllJobs] = useState([]);
    const [jobsLoading, setJobsLoading] = useState(false);

    // Job application state
    const [applyingJob, setApplyingJob] = useState(null);
    const [additionalDetails, setAdditionalDetails] = useState('');
    const [isApplying, setIsApplying] = useState(false);

    useEffect(() => {
        loadProfile();
        loadInterviews();
        loadJobs();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await api.getMyProfile();
            setProfile(data.profile);
        } catch (err) { console.error(err); }
        finally { setProfileLoading(false); }
    };

    const loadInterviews = async () => {
        setInterviewsLoading(true);
        try {
            const data = await api.getMyInterviews();
            setInterviews(data.interviews || []);
            const scheduled = await api.getScheduledInterviews();
            setScheduledInterviews(scheduled || []);
        } catch (err) { console.error(err); }
        finally { setInterviewsLoading(false); }
    };

    const loadJobs = async () => {
        setJobsLoading(true);
        try {
            const data = await api.listJobs();
            setAllJobs(data.jobs || []);
        } catch (err) { console.error(err); }
        finally { setJobsLoading(false); }
    };

    const handleApplyJob = async () => {
        if (!applyingJob) return;
        setIsApplying(true);
        try {
            await api.applyJob({
                job_id: applyingJob.id,
                additional_details: additionalDetails
            });
            alert('Application submitted successfully!');
            setApplyingJob(null);
            setAdditionalDetails('');
        } catch (err) {
            alert(err.message || 'Failed to submit application');
        } finally {
            setIsApplying(false);
        }
    };

    const uploadFile = async (file) => {
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['pdf', 'docx', 'doc'].includes(ext)) {
            setUploadError('Please upload a PDF or DOCX file.');
            return;
        }
        setIsUploading(true); setUploadError(''); setUploadResult(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const data = await api.uploadResume(formData);
            setUploadResult(data);
            const profileData = await api.getMyProfile();
            setProfile(profileData.profile);
            setTimeout(() => setActiveTab('profile'), 1500);
        } catch (err) {
            setUploadError(err.message || 'Failed to upload resume.');
        } finally { setIsUploading(false); }
    };

    const startAIInterview = async (jobId = null) => {
        setActiveTab('active-interview');
        try {
            const data = await api.startInterview({
                candidate_id: profile?.candidate_id,
                job_id: jobId,
            });
            setActiveSession(data.session_id);
            setMessages([{ role: 'ai', content: data.message || data.first_question || 'Interview started.' }]);
            setInterviewResult(null);
        } catch (err) { alert(err.message); }
    };

    const handleRespondInvitation = async (interviewId, response) => {
        try {
            await api.scheduleConfirm({ interview_id: interviewId, response });
            alert(`Interview ${response === 'accepted' ? 'confirmed' : 'skipped'} successfully!`);
            loadInterviews();
        } catch (err) {
            alert(err.message || 'Failed to respond to invitation');
        }
    };

    const sendMessage = async () => {
        if (!messageInput.trim() || !activeSession) return;
        const msg = messageInput;
        setMessageInput('');
        setMessages(prev => [...prev, { role: 'user', content: msg }]);
        setSendingMessage(true);
        try {
            const data = await api.sendMessage({ session_id: activeSession, user_message: msg });
            setMessages(prev => [...prev, { role: 'ai', content: data.message || data.ai_response || '' }]);
            if (data.status === 'completed') {
                const result = await api.getResult(activeSession);
                setInterviewResult(result);
                loadInterviews();
            }
        } catch (err) { alert(err.message); }
        finally { setSendingMessage(false); }
    };

    const loadUpskilling = async (jobId = selectedJobId) => {
        setUpskillingLoading(true);
        setUpskillingError('');
        try {
            const data = await api.getUpskillingRecommendations(jobId || '');
            setUpskillingData(data);
        } catch (err) {
            setUpskillingError(err.message || 'Failed to load upskilling recommendations.');
        } finally {
            setUpskillingLoading(false);
        }
    };

    return (
        <div className="portal">
            <header className="portal-header">
                <div className="portal-header-left">
                    <span className="logo-icon">⚡</span>
                    <span className="portal-title">HireFlow AI</span>
                    <span className="portal-badge candidate-badge">Candidate</span>
                </div>
                <div className="portal-header-right">
                    <span className="portal-user">👤 {user?.name}</span>
                    <button onClick={logout} className="logout-btn">Logout</button>
                </div>
            </header>

            <nav className="portal-tabs">
                <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>👤 Profile</button>
                <button className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>📄 Upload</button>
                <button className={`tab-btn ${activeTab === 'interviews' ? 'active' : ''}`} onClick={() => setActiveTab('interviews')}>🎙️ Interviews</button>
                <button className={`tab-btn ${activeTab === 'jobs' ? 'active' : ''}`} onClick={() => setActiveTab('jobs')}>💼 Jobs</button>
                <button className={`tab-btn ${activeTab === 'upskilling' ? 'active' : ''}`} onClick={() => setActiveTab('upskilling')}>📚 Upskilling</button>
            </nav>

            <main className="portal-content">
                {/* PROFILE TAB */}
                {activeTab === 'profile' && (
                    <div className="portal-section">
                        <div className="section-header"><h2>👤 My Profile</h2></div>
                        {profileLoading ? <p>Loading profile...</p> : !profile ? (
                            <div className="empty-state">
                                <p>No resume uploaded. Get started in the Upload tab!</p>
                            </div>
                        ) : (
                            <div className="profile-container">
                                <div className="card glass-card profile-card">
                                    <div className="profile-header-info">
                                        <div className="profile-avatar">{(profile.name || 'U').charAt(0).toUpperCase()}</div>
                                        <div>
                                            <h3 className="profile-name">{profile.name}</h3>
                                            <p className="profile-email">{profile.email}</p>
                                        </div>
                                    </div>
                                    <div className="profile-section">
                                        <h4>🎯 Skills</h4>
                                        <div className="skill-tags">
                                            {profile.skills?.map((s, i) => <SkillTag key={i} skill={s} />)}
                                        </div>
                                    </div>
                                    {profile.aptitude_scores && (
                                        <div className="profile-section">
                                            <h4>📊 Aptitude Scores</h4>
                                            <div className="scores-grid">
                                                {Object.entries(profile.aptitude_scores).map(([k, v]) => <ScoreBar key={k} score={v} label={k} />)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* UPLOAD TAB */}
                {activeTab === 'upload' && (
                    <div className="portal-section">
                        <div className="section-header"><h2>📄 Upload Resume</h2></div>
                        <div className={`upload-zone ${isDragging ? 'drag-over' : ''}`}
                            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={e => { e.preventDefault(); uploadFile(e.dataTransfer.files[0]); }}
                            onClick={() => fileInputRef.current.click()}
                        >
                            <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => uploadFile(e.target.files[0])} />
                            {isUploading ? <p>Processing...</p> : <p>Drag & Drop or Click to Upload Resume</p>}
                        </div>
                        {uploadResult && <div style={{ marginTop: '1rem' }}><CandidateCard candidate={uploadResult} /></div>}
                    </div>
                )}

                {/* INTERVIEWS TAB */}
                {activeTab === 'interviews' && (
                    <div className="portal-section">
                        <div className="section-header">
                            <div>
                                <h2>🎙️ Interview Management Hub</h2>
                                <p className="muted-text">Track your invitations, scheduled video calls, and AI screening performance.</p>
                            </div>
                        </div>

                        {interviewsLoading ? (
                            <div className="loading-state">
                                <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
                                <p>Syncing your interview schedule...</p>
                            </div>
                        ) : (
                            <div className="interviews-hub">
                                {/* Section 1: Invitations */}
                                {scheduledInterviews.filter(iv => iv.schedule_status === 'offered').length > 0 && (
                                    <div className="hub-section">
                                        <div className="hub-section-header">
                                            <h3 className="hub-section-title"><span>🎁</span> New Invitations</h3>
                                        </div>
                                        <div className="hub-grid">
                                            {scheduledInterviews.filter(iv => iv.schedule_status === 'offered').map(iv => (
                                                <div key={iv.id} className="hub-card">
                                                    <span className="hub-badge tag-invitation">New Offer</span>
                                                    <h4 className="hub-card-title">{iv.job_title || 'Role Invitation'}</h4>
                                                    <div className="hub-card-info">
                                                        <div className="hub-card-info-item">
                                                            <span>👤 Recruiter:</span>
                                                            <span style={{ color: 'white' }}>{iv.interviewer_name || 'Hiring Team'}</span>
                                                        </div>
                                                        <div className="hub-card-info-item">
                                                            <span>📅 Proposed:</span>
                                                            <span style={{ color: 'white' }}>{new Date(iv.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                                        </div>
                                                    </div>
                                                    <div className="hub-card-actions">
                                                        <button className="hub-btn hub-btn-primary" onClick={() => handleRespondInvitation(iv.id, 'accepted')}>
                                                            Accept & Confirm
                                                        </button>
                                                        <button className="hub-btn hub-btn-danger" onClick={() => handleRespondInvitation(iv.id, 'skipped')}>
                                                            Skip
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Section 2: Confirmed Calls */}
                                {scheduledInterviews.filter(iv => iv.schedule_status === 'accepted').length > 0 && (
                                    <div className="hub-section">
                                        <div className="hub-section-header">
                                            <h3 className="hub-section-title"><span>🎥</span> Confirmed Video Calls</h3>
                                        </div>
                                        <div className="hub-grid">
                                            {scheduledInterviews.filter(iv => iv.schedule_status === 'accepted').map(iv => (
                                                <div key={iv.id} className="hub-card">
                                                    <span className="hub-badge tag-video">Live Session</span>
                                                    <h4 className="hub-card-title">{iv.job_title}</h4>
                                                    <div className="hub-card-info">
                                                        <div className="hub-card-info-item">
                                                            <span>⏰ Scheduled Time:</span>
                                                            <span style={{ color: 'white' }}>{new Date(iv.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                                        </div>
                                                        <div className="hub-card-info-item" style={{ marginTop: '0.5rem' }}>
                                                            <span className="confidence-dot confidence-high"></span>
                                                            <span style={{ color: 'var(--accent-400)', fontSize: '0.8rem' }}>Interviewer is ready</span>
                                                        </div>
                                                    </div>
                                                    <div className="hub-card-actions">
                                                        <button className="hub-btn hub-btn-primary" style={{ width: '100%' }} onClick={() => window.location.assign(`/video-interview/${iv.id}`)}>
                                                            Join Video Call Now
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Section 3: AI Screenings */}
                                <div className="hub-section">
                                    <div className="hub-section-header">
                                        <h3 className="hub-section-title"><span>🤖</span> AI Technical Screenings</h3>
                                        <button className="hub-btn hub-btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem' }} onClick={() => startAIInterview(null)}>
                                            + Start Practice Session
                                        </button>
                                    </div>
                                    <div className="hub-grid">
                                        {interviews.length === 0 && (
                                            <div className="card glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', borderStyle: 'dashed' }}>
                                                <p className="muted-text">No screenings attempted yet. Apply for jobs to unlock role-specific AI interviews!</p>
                                            </div>
                                        )}
                                        {interviews.map(iv => (
                                            <div key={iv.id} className="hub-card">
                                                <span className="hub-badge tag-ai">{iv.status === 'completed' ? 'Evaluated' : 'In Progress'}</span>
                                                <h4 className="hub-card-title">{iv.job_title || 'General Aptitude'}</h4>

                                                {iv.status === 'active' ? (
                                                    <div className="hub-card-info">
                                                        <p style={{ fontStyle: 'italic' }}>Ongoing session - finish to see your final score.</p>
                                                        <div className="hub-card-actions">
                                                            <button className="hub-btn hub-btn-primary" style={{ width: '100%' }} onClick={() => startAIInterview(iv.job_id)}>
                                                                Continue Interview
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="hub-card-info">
                                                        <div className="ai-score-badge">
                                                            <span className="ai-score-value">{(iv.total_score * 100).toFixed(0)}</span>
                                                            <span className="ai-score-label">/ 100 Overall Score</span>
                                                        </div>
                                                        <div className="hub-card-actions">
                                                            <button className="hub-btn hub-btn-secondary" style={{ width: '100%' }} onClick={() => startAIInterview(iv.job_id)}>
                                                                Retake Session
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ACTIVE AI INTERVIEW */}
                {activeTab === 'active-interview' && (
                    <div className="portal-section">
                        <AptitudeChatbot
                            candidateId={profile?.candidate_id}
                            onClose={() => { setActiveTab('interviews'); loadInterviews(); }}
                        />
                    </div>
                )}

                {/* JOBS TAB */}
                {activeTab === 'jobs' && (
                    <div className="portal-section">
                        <div className="section-header"><h2>💼 Available Jobs</h2></div>
                        <div className="job-list-grid">
                            {allJobs.map(job => (
                                <div key={job.id} className="card glass-card job-display-card">
                                    <h3>{job.title}</h3>
                                    <p>{job.description}</p>
                                    <div className="skill-tags">{job.required_skills?.map((s, i) => <SkillTag key={i} skill={s} />)}</div>
                                    <button className="action-btn primary-btn" style={{ marginTop: '1rem', width: '100%' }} onClick={() => setApplyingJob(job)}>Apply</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* UPSKILLING TAB */}
                {activeTab === 'upskilling' && (
                    <div className="portal-section">
                        <div className="section-header">
                            <div>
                                <h2>🚀 Career Growth & Upskilling</h2>
                                <p className="muted-text">Bridge your skill gaps with AI-curated learning paths tailored to your target roles.</p>
                            </div>
                        </div>

                        <div className="card glass-card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '300px' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginBottom: '0.5rem', display: 'block' }}>Target Career Role</label>
                                    <select
                                        className="form-input"
                                        style={{ width: '100%', cursor: 'pointer' }}
                                        value={selectedJobId}
                                        onChange={e => {
                                            setSelectedJobId(e.target.value);
                                            loadUpskilling(e.target.value);
                                        }}
                                    >
                                        <option value="">Select a role to analyze...</option>
                                        {allJobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                                    </select>
                                </div>
                                <button
                                    className="action-btn ghost-btn"
                                    onClick={() => loadUpskilling(selectedJobId)}
                                    style={{ height: '42px', marginTop: '1.3rem' }}
                                >
                                    🔄 Refresh Analysis
                                </button>
                            </div>
                        </div>

                        {upskillingLoading ? (
                            <div className="loading-state" style={{ padding: '4rem 0' }}>
                                <span className="spinner" style={{ width: 48, height: 48, borderWidth: 4 }} />
                                <p style={{ marginTop: '1rem', fontSize: '1.1rem' }}>AI is analyzing your profile against the role requirements...</p>
                            </div>
                        ) : !upskillingData?.recommendations || upskillingData.recommendations.length === 0 ? (
                            <div className="empty-upskilling card glass-card">
                                <span className="empty-upskilling-icon">🎯</span>
                                <h3>Select a role to start your journey</h3>
                                <p>We'll analyze your current top skills and find the best courses to help you land your dream job.</p>
                            </div>
                        ) : (
                            <div className="upskilling-container">
                                {/* Left Side: Skill Gaps */}
                                <div className="upskilling-sidebar">
                                    <div className="card glass-card skill-gap-card">
                                        <h3 style={{ fontSize: '1rem', color: 'var(--rose-400)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            ⚠️ Identified Gaps
                                        </h3>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '0.25rem' }}>Skills you need to develop:</p>
                                        <div className="skill-gap-list">
                                            {upskillingData.recommendations.map((rec, i) => (
                                                <div key={i} className="skill-gap-item">
                                                    <div className="skill-gap-dot" />
                                                    <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{rec.skill}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="card glass-card" style={{ padding: '1.25rem' }}>
                                        <h3 style={{ fontSize: '1rem', color: 'var(--accent-400)' }}>💡 Pro Tip</h3>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--gray-300)', marginTop: '0.5rem', lineHeight: '1.5' }}>
                                            Complete a course and update your resume to automatically boost your matching score by up to 15% for this role.
                                        </p>
                                    </div>
                                </div>

                                {/* Right Side: Recommendations */}
                                <div className="upskilling-main">
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>📚 Recommended Learning Paths</h3>
                                    <div className="course-grid">
                                        {upskillingData.recommendations.flatMap((rec, recIdx) =>
                                            rec.courses?.map((course, cIdx) => (
                                                <div key={`${recIdx}-${cIdx}`} className="course-card">
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <span className="course-badge">{rec.skill}</span>
                                                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                            {course.level || 'Intermediate'}
                                                        </span>
                                                    </div>
                                                    <h4 className="course-title">{course.title}</h4>
                                                    <div className="course-provider">
                                                        <span>🏢 {course.provider}</span>
                                                        <span>•</span>
                                                        <span>⏱️ {course.duration || 'approx. 4-6 weeks'}</span>
                                                    </div>
                                                    <div className="course-footer">
                                                        <a href={course.url} target="_blank" rel="noreferrer" className="course-link">
                                                            View Course Details ➔
                                                        </a>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Apply Modal */}
            {applyingJob && (
                <div className="modal-overlay">
                    <div className="modal-content application-modal card">
                        <div className="app-modal-header">
                            <span className="app-modal-job-badge">Applying Now</span>
                            <h3 className="app-modal-title">{applyingJob.title}</h3>
                            <p className="app-modal-subtitle">Configure your application for the hiring team at {applyingJob.company || 'HireFlow'}.</p>
                        </div>

                        <div className="app-modal-body">
                            {/* Profile Snapshot */}
                            <div className="app-form-group">
                                <label className="app-form-label">📊 Profile Snapshot <span>(What the recruiter sees)</span></label>
                                <div className="profile-preview-card">
                                    <div className="profile-preview-item">
                                        <span style={{ color: 'var(--gray-500)' }}>Full Name</span>
                                        <span style={{ color: 'white' }}>{profile?.name || 'Candidate'}</span>
                                    </div>
                                    <div className="profile-preview-item" style={{ flexDirection: 'column', gap: '0.5rem', border: 'none' }}>
                                        <span style={{ color: 'var(--gray-500)' }}>Top Skills Matched</span>
                                        <div className="skill-tags">
                                            {profile?.skills?.slice(0, 8).map((s, i) => (
                                                <span key={i} className="skill-tag skill-tag-matched">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Cover Letter / Why me? */}
                            <div className="app-form-group">
                                <label className="app-form-label">✍️ Professional Summary <span>(Max 500 chars)</span></label>
                                <textarea
                                    className="app-form-input"
                                    rows={5}
                                    placeholder="Briefly explain why you're a perfect fit for this role..."
                                    value={additionalDetails}
                                    onChange={e => setAdditionalDetails(e.target.value)}
                                />
                            </div>

                            {/* Links & Availability */}
                            <div className="grid-2-cols">
                                <div className="app-form-group">
                                    <label className="app-form-label">🔗 Portfolio / LinkedIn</label>
                                    <input type="url" className="app-form-input" placeholder="https://..." />
                                </div>
                                <div className="app-form-group">
                                    <label className="app-form-label">📅 Earliest Start Date</label>
                                    <input type="date" className="app-form-input" />
                                </div>
                            </div>
                        </div>

                        <div className="app-modal-footer">
                            <button className="hub-btn hub-btn-secondary" onClick={() => setApplyingJob(null)}>Cancel</button>
                            <button className="hub-btn hub-btn-primary" style={{ padding: '0.75rem 2.5rem' }} onClick={handleApplyJob}>
                                Confirm Application ➔
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
