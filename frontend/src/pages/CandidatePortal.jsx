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
                        <div className="section-header"><h2>🎙️ Interview Hub</h2></div>

                        {interviewsLoading ? <p>Loading...</p> : (
                            <div className="interviews-hub">
                                {/* Offers */}
                                {scheduledInterviews.filter(iv => iv.schedule_status === 'offered').length > 0 && (
                                    <div className="hub-section">
                                        <h3 style={{ color: '#34d399' }}>🎁 New Invitations</h3>
                                        {scheduledInterviews.filter(iv => iv.schedule_status === 'offered').map(iv => (
                                            <div key={iv.id} className="card glass-card hub-card">
                                                <h4>{iv.job_title}</h4>
                                                <p>Recruiter: {iv.interviewer_name}</p>
                                                <p>Proposed: {new Date(iv.scheduled_at).toLocaleString()}</p>
                                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                                    <button className="action-btn primary-btn" onClick={() => handleRespondInvitation(iv.id, 'accepted')}>Accept</button>
                                                    <button className="action-btn ghost-btn" onClick={() => handleRespondInvitation(iv.id, 'skipped')}>Skip</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Confirmed Video Calls */}
                                {scheduledInterviews.filter(iv => iv.schedule_status === 'accepted').length > 0 && (
                                    <div className="hub-section">
                                        <h3 style={{ color: '#6366f1' }}>🎥 Confirmed Video Calls</h3>
                                        {scheduledInterviews.filter(iv => iv.schedule_status === 'accepted').map(iv => (
                                            <div key={iv.id} className="card glass-card hub-card">
                                                <h4>{iv.job_title}</h4>
                                                <p>⏰ {new Date(iv.scheduled_at).toLocaleString()}</p>
                                                <button className="action-btn primary-btn" style={{ marginTop: '1rem', width: '100%' }} onClick={() => window.location.assign(`/video-interview/${iv.id}`)}>Join Now</button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* AI Screenings */}
                                <div className="hub-section">
                                    <h3 style={{ color: 'var(--primary-400)' }}>🤖 AI Screenings</h3>
                                    <button className="action-btn secondary-btn" style={{ marginBottom: '1rem' }} onClick={() => startAIInterview(null)}>+ Start General Screening</button>
                                    <div className="interview-list">
                                        {interviews.map(iv => (
                                            <div key={iv.id} className="card glass-card hub-card">
                                                <h4>{iv.job_title || 'General Screening'}</h4>
                                                <p>Status: {iv.status}</p>
                                                {iv.status === 'active' ? (
                                                    <button className="action-btn primary-btn small-btn" onClick={() => startAIInterview(iv.job_id)}>Continue</button>
                                                ) : <p>Score: {(iv.total_score * 100).toFixed(0)}%</p>}
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
                        <div className="section-header"><h2>📚 Upskilling</h2></div>
                        {upskillingLoading ? <p>Analyzing...</p> : (
                            <div className="upskilling-wrapper">
                                <select className="form-input" style={{ marginBottom: '1.5rem' }} onChange={e => loadUpskilling(e.target.value)}>
                                    <option value="">Select a role</option>
                                    {upskillingData?.jobs?.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                                </select>
                                {upskillingData?.recommendations?.map((rec, i) => (
                                    <div key={i} className="card glass-card" style={{ marginBottom: '1rem' }}>
                                        <h4>{rec.skill}</h4>
                                        <ul>{rec.courses?.map((c, ci) => <li key={ci}><a href={c.link} target="_blank">{c.title}</a> ({c.provider})</li>)}</ul>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Apply Modal */}
            {applyingJob && (
                <div className="modal-overlay">
                    <div className="modal-content glass-card card">
                        <h3>Apply for {applyingJob.title}</h3>
                        <textarea className="form-input" rows={4} placeholder="Additional details..." value={additionalDetails} onChange={e => setAdditionalDetails(e.target.value)} />
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <button className="action-btn ghost-btn" onClick={() => setApplyingJob(null)}>Cancel</button>
                            <button className="action-btn primary-btn" onClick={handleApplyJob}>Submit</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
