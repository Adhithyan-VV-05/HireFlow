import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import SkillTag from '../components/SkillTag';
import ScoreBar from '../components/ScoreBar';
import CandidateCard from '../components/CandidateCard';
import AptitudeChatbot from './AptitudeChatbot';
import ResumeViewer from '../components/ResumeViewer';
import SkillTestModal from '../components/SkillTestModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
    const [resumeHistory, setResumeHistory] = useState([]);
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
    const [portfolioUrl, setPortfolioUrl] = useState('');
    const [startDate, setStartDate] = useState('');
    const [isApplying, setIsApplying] = useState(false);
    const [selectedResumeId, setSelectedResumeId] = useState('');

    // Resume Viewer state
    const [viewingResume, setViewingResume] = useState(null);

    const [myApplications, setMyApplications] = useState([]);
    const [appsLoading, setAppsLoading] = useState(false);

    // Skill Test state
    const [skillToTest, setSkillToTest] = useState(null);

    useEffect(() => {
        loadProfile();
        loadInterviews();
        loadJobs();
        loadResumeHistory();
        loadMyApplications();
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

    const loadResumeHistory = async () => {
        try {
            const data = await api.getResumeHistory();
            setResumeHistory(data.resumes || []);
        } catch (err) { console.error(err); }
    };

    const loadMyApplications = async () => {
        setAppsLoading(true);
        try {
            const data = await api.getMyApplications();
            setMyApplications(data.applications || []);
        } catch (err) { console.error(err); }
        finally { setAppsLoading(false); }
    };

    const handleApplyJob = async () => {
        if (!applyingJob) return;
        if (!selectedResumeId) {
            alert('Please select a resume to attach with your application.');
            return;
        }
        setIsApplying(true);
        try {
            await api.applyJob({
                job_id: applyingJob.id,
                applied_resume_id: selectedResumeId,
                portfolio_url: portfolioUrl,
                start_date: startDate
            });
            alert('Application submitted successfully!');
            setApplyingJob(null);
            setPortfolioUrl('');
            setStartDate('');
            setSelectedResumeId('');
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

            // Refresh everything so the dashboard updates
            await loadProfile();
            await loadResumeHistory();

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
                <button className={`tab-btn ${activeTab === 'upskilling' ? 'active' : ''}`} onClick={() => {
                    setActiveTab('upskilling');
                    if (!upskillingData) loadUpskilling('');
                }}>📚 Upskilling</button>
            </nav>

            <main className="portal-content">
                {/* PROFILE TAB */}
                {activeTab === 'profile' && (
                    <div className="portal-section profile-tab-animate">
                        <div className="profile-hero card glass-card">
                            <div className="profile-hero-content">
                                <div className="profile-avatar-large">
                                    {(profile?.name || 'U').charAt(0).toUpperCase()}
                                    <div className="avatar-pulse"></div>
                                </div>
                                <div className="profile-basic-info">
                                    <h2 className="profile-full-name">{profile?.name || 'Candidate Name'}</h2>
                                    <p className="profile-tagline">🚀 Verified Talent • {profile?.email}</p>
                                    <div className="profile-badges">
                                        {profile?.is_verified && <span className="hub-badge pulse-badge" style={{ background: 'var(--emerald-600)', color: 'white' }}>✓ Verified</span>}
                                        <span className="hub-badge secondary-badge">{resumeHistory.length} Resumes</span>
                                        <span className="hub-badge accent-badge">{myApplications.length} Applications</span>
                                    </div>
                                </div>
                                <div className="profile-quick-actions">
                                    <button className="hub-btn hub-btn-primary" onClick={() => setActiveTab('upload')}>
                                        Update Resume
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="profile-grid">
                            {/* Left Column: Stats & Skills */}
                            <div className="profile-main-col">
                                <div className="card glass-card">
                                    <div className="card-header-fancy">
                                        <h3>🎯 Expertise Domains</h3>
                                        <span className="header-icon">✨</span>
                                    </div>
                                    <div className="skill-analysis-container">
                                        {profile?.skills && profile.skills.length > 0 ? (
                                            <div className="categorized-skills-grid">
                                                {Object.entries((() => {
                                                    const skills = profile.skills;
                                                    const domains = {
                                                        'Frontend': ['html', 'css', 'javascript', 'js', 'react', 'angular', 'vue', 'tailwind', 'sass', 'bootstrap', 'webpack', 'babel', 'typescript', 'ts', 'jquery', 'next.js', 'canvas'],
                                                        'Backend': ['node', 'express', 'python', 'django', 'flask', 'java', 'spring', 'ruby', 'rails', 'php', 'laravel', 'sql', 'mysql', 'postgres', 'mongodb', 'redis', 'graphql', 'rest', 'api', 'go', 'golang', 'c++', 'firebase', 'sqlite'],
                                                        'Designing': ['figma', 'adobe', 'photoshop', 'illustrator', 'sketch', 'xd', 'ui', 'ux', 'design', 'canva', 'responsive', 'wireframing'],
                                                        'DevOps & Cloud': ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'terraform', 'ci/cd', 'nginx', 'linux', 'unix', 'shell', 'bash', 'deployment', 'serverless'],
                                                        'Version Control': ['git', 'github', 'gitlab', 'bitbucket', 'svn', 'version control'],
                                                        'Mobile': ['native', 'flutter', 'swift', 'kotlin', 'android', 'ios', 'ionic'],
                                                        'Tools & QA': ['jira', 'trello', 'agile', 'scrum', 'kanban', 'jest', 'selenium', 'cypress', 'slack', 'postman', 'swagger'],
                                                    };
                                                    const result = {};
                                                    skills.forEach(skill => {
                                                        const lowerSkill = skill.toLowerCase();
                                                        let categorized = false;
                                                        for (const [domain, keywords] of Object.entries(domains)) {
                                                            if (keywords.some(k => lowerSkill.includes(k))) {
                                                                if (!result[domain]) result[domain] = [];
                                                                result[domain].push(skill);
                                                                categorized = true; break;
                                                            }
                                                        }
                                                        if (!categorized) {
                                                            if (!result['Other Expertise']) result['Other Expertise'] = [];
                                                            result['Other Expertise'].push(skill);
                                                        }
                                                    });
                                                    return result;
                                                })()).map(([domain, items]) => (
                                                    <div key={domain} className="skill-domain-group">
                                                        <h4 className="domain-label">
                                                            <span className="domain-dot"></span>
                                                            {domain}
                                                        </h4>
                                                        <div className="skill-tags">
                                                            {items.map((s, i) => {
                                                                const testScore = profile?.skill_scores?.[s];
                                                                return (
                                                                    <div key={i} className="skill-tag-enhanced" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.6rem 0.8rem' }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '1rem' }}>
                                                                            <span style={{ fontWeight: 600 }}>{s}</span>
                                                                            <span style={{ fontSize: '0.75rem', color: testScore ? 'var(--emerald-400)' : 'var(--gray-500)' }}>
                                                                                {testScore ? `${testScore.toFixed(0)}%` : '0%'}
                                                                            </span>
                                                                        </div>
                                                                        <button
                                                                            className={`hub-btn ${testScore ? 'hub-btn-secondary locked-btn' : 'hub-btn-primary'}`}
                                                                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', width: '100%' }}
                                                                            onClick={() => {
                                                                                if (testScore) {
                                                                                    alert('You must pay 500Rs to unlock a retake for this subject or purchase premium.');
                                                                                } else {
                                                                                    setSkillToTest(s);
                                                                                }
                                                                            }}
                                                                        >
                                                                            {testScore ? '🔒 Re-test (Premium)' : '⚡ Analyze Skill'}
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="empty-mini-state">
                                                <p>Upload your resume to extract and categorize your skills.</p>
                                                <button className="hub-btn hub-btn-secondary" onClick={() => setActiveTab('upload')}>Upload Resume</button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="card glass-card">
                                    <div className="card-header-fancy">
                                        <h3>📊 Skill Assessment Audit</h3>
                                        <span className="header-icon">📈</span>
                                    </div>
                                    <div className="performance-content">
                                        <div className="score-summary-v2" style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-400)' }}>{profile?.overall_score || 0}</div>
                                                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--gray-500)' }}>Candidate Score</div>
                                            </div>
                                            <div style={{ flex: 1, textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--emerald-400)' }}>{profile?.system_max_score || 100}</div>
                                                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--gray-500)' }}>Peer Maximum</div>
                                            </div>
                                        </div>

                                        <div className="scores-grid-premium">
                                            {profile?.skill_scores && Object.entries(profile.skill_scores).map(([k, v]) => (
                                                <div key={k} className="score-card-premium">
                                                    <div className="score-info-header">
                                                        <span className="score-label">{k}</span>
                                                        <span className="score-value">{v.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="premium-progress-bg">
                                                        <div className="premium-progress-fill" style={{ width: `${v}%`, background: 'var(--accent-500)' }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!profile?.skill_scores || Object.keys(profile.skill_scores).length === 0) && (
                                                <p className="muted-text" style={{ textAlign: 'center', padding: '1rem' }}>No skills analyzed yet. Start a rapid fire test above! ⚡</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="card glass-card" style={{ marginTop: '1.5rem', minHeight: '350px' }}>
                                    <div className="card-header-fancy">
                                        <h3>📉 Skill Proficiency Chart</h3>
                                        <span className="header-icon">📊</span>
                                    </div>
                                    <div style={{ width: '100%', height: '260px', padding: '1rem' }}>
                                        {profile?.skill_scores && Object.keys(profile.skill_scores).length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={Object.entries(profile?.skill_scores || {}).map(([name, value]) => ({ name, value }))}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                                    <XAxis dataKey="name" stroke="var(--gray-600)" fontSize={10} axisLine={false} tickLine={false} />
                                                    <YAxis stroke="var(--gray-600)" fontSize={10} axisLine={false} tickLine={false} />
                                                    <Tooltip
                                                        contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px' }}
                                                        itemStyle={{ color: 'var(--accent-400)' }}
                                                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                                    />
                                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                        {Object.entries(profile?.skill_scores || {}).map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={`hsl(${220 + index * 10}, 70%, 60%)`} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="empty-mini-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                <p className="muted-text">Test results will appear here as a chart.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Activity & Summary */}
                            <div className="profile-side-col">
                                <div className="card glass-card">
                                    <div className="card-header-fancy">
                                        <h3>🕒 Recent Activity</h3>
                                        <span className="header-icon">🔔</span>
                                    </div>
                                    <div className="activity-feed">
                                        {myApplications.slice(0, 5).map(app => (
                                            <div key={app.id} className="activity-item">
                                                <div className="activity-status-dot" data-status={app.status}></div>
                                                <div className="activity-details">
                                                    <p className="activity-title">Applied to <strong>{app.job_title}</strong></p>
                                                    <div className="activity-meta">
                                                        <span className={`status-pill pill-${app.status}`}>{app.status}</span>
                                                        <span className="activity-date">{new Date(app.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {myApplications.length === 0 && <p className="muted-text">No recent applications.</p>}
                                    </div>
                                </div>

                                <div className="card glass-card profile-summary-card">
                                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                                        🏆 Profile Summary
                                        {profile?.global_rank && <span className="rank-badge">{profile.global_rank}</span>}
                                    </h3>

                                    <div className="profile-completion-section" style={{ marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem', color: 'var(--gray-400)' }}>
                                            <span>Profile Completion</span>
                                            <span style={{ color: 'var(--accent-400)', fontWeight: 800 }}>{profile?.completion_percentage || 0}%</span>
                                        </div>
                                        <div className="completion-bar-bg" style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div className="completion-bar-fill" style={{
                                                width: `${profile?.completion_percentage || 0}%`,
                                                height: '100%',
                                                background: 'linear-gradient(90deg, var(--primary-500), var(--accent-500))',
                                                boxShadow: '0 0 10px rgba(99, 102, 241, 0.4)',
                                                transition: 'width 1s ease-out'
                                            }}></div>
                                        </div>
                                    </div>

                                    <div className="summary-stat-row">
                                        <span>System Percentile</span>
                                        <strong>{Math.max(0, 100 - (profile?.global_rank / (profile?.total_candidates || 1)) * 100).toFixed(0)}th</strong>
                                    </div>
                                    <div className="summary-stat-row">
                                        <span>Current Power Score</span>
                                        <strong style={{ color: 'var(--accent-400)' }}>{profile?.overall_score || 0} / {profile?.system_max_score || 100}</strong>
                                    </div>
                                    <div className="summary-stat-row">
                                        <span>Interviews Done</span>
                                        <strong>{scheduledInterviews.filter(i => i.status === 'completed').length}</strong>
                                    </div>
                                    <div className="summary-stat-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.65rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                            <span>Aptitude Mastery</span>
                                            <strong style={{ color: profile?.aptitude_mastery > 0 ? 'var(--emerald-400)' : 'var(--gray-500)' }}>
                                                {profile?.aptitude_mastery > 0
                                                    ? `${profile.aptitude_mastery.toFixed(0)}%`
                                                    : 'Not Attempted'}
                                            </strong>
                                        </div>
                                        {(!profile?.aptitude_scores || Object.keys(profile.aptitude_scores).length === 0) && (
                                            <button
                                                className="hub-btn hub-btn-primary"
                                                style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem', borderRadius: '8px', fontWeight: '700', marginTop: '0.5rem' }}
                                                onClick={() => startAIInterview(null)}
                                            >
                                                ⚡ Aptitude Test
                                            </button>
                                        )}
                                    </div>
                                    <div className="summary-stat-row" style={{ alignItems: 'center' }}>
                                        <span>Active Resume</span>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="hub-btn hub-btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                                onClick={() => {
                                                    const active = resumeHistory.find(r => r.is_active);
                                                    if (active) setViewingResume({
                                                        id: active.id,
                                                        file_name: active.file_name,
                                                        url: api.getViewResumeUrl(active.id),
                                                        entities: profile?.entities
                                                    });
                                                    else alert('No active resume found. Please upload one in the Upload tab.');
                                                }}>
                                                👁️ View Resume
                                            </button>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                )}

                {/* UPLOAD TAB */}
                {activeTab === 'upload' && (
                    <div className="portal-section">
                        <div className="section-header"><h2>📄 Resume Management</h2></div>

                        <div className="card glass-card" style={{ marginBottom: '2rem' }}>
                            <div className={`upload-zone ${isDragging ? 'drag-over' : ''}`}
                                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={e => { e.preventDefault(); uploadFile(e.dataTransfer.files[0]); }}
                                onClick={() => fileInputRef.current.click()}
                                style={{ minHeight: '180px' }}
                            >
                                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => uploadFile(e.target.files[0])} />
                                {isUploading ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <span className="spinner" style={{ marginBottom: '1rem' }} />
                                        <p>Analyzing your expertise...</p>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📤</div>
                                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>Drop your latest resume here</p>
                                        <p className="muted-text">Supports PDF, DOCX (Max 10MB)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {uploadError && <div className="error-box" style={{ marginBottom: '1.5rem' }}>⚠️ {uploadError}</div>}

                        <div className="section-header"><h3>📜 Upload History</h3></div>
                        <div className="history-list">
                            {resumeHistory.length === 0 ? (
                                <p className="muted-text">No previous uploads found.</p>
                            ) : (
                                resumeHistory.map((r, i) => (
                                    <div key={r.id} className={`card glass-card history-item ${r.is_active ? 'active-history' : ''}`}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                            <div className="file-icon">{r.file_name.endsWith('.pdf') ? '📕' : '📘'}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <span style={{ fontWeight: 600 }}>{r.file_name}</span>
                                                    {r.is_active && <span className="hub-badge" style={{ background: 'var(--accent-500)', fontSize: '0.65rem' }}>ACTIVE VERSION</span>}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                                                    Uploaded on {new Date(r.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="history-actions">
                                                <button
                                                    onClick={() => setViewingResume({
                                                        id: r.id,
                                                        file_name: r.file_name,
                                                        url: api.getViewResumeUrl(r.id),
                                                        entities: r.is_active ? profile?.entities : null
                                                    })}
                                                    className="action-btn ghost-btn"
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                                >
                                                    👁️ Open File
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
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
                            onClose={() => { setActiveTab('profile'); loadInterviews(); loadProfile(); }}
                        />
                    </div>
                )}

                {/* JOBS TAB */}
                {activeTab === 'jobs' && (
                    <div className="portal-section">
                        <div className="section-header">
                            <div>
                                <h2>💼 Career Opportunities</h2>
                                <p className="muted-text">Explore roles tailored to your skills and start your next journey.</p>
                            </div>
                        </div>
                        <div className="job-list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
                            {allJobs.map(job => (
                                <div key={job.id} className="card glass-card job-display-card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{job.title}</h3>
                                        <div style={{ textAlign: 'right' }}>
                                            {job.deadline && (
                                                <span style={{ fontSize: '0.7rem', color: 'var(--rose-400)', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(244, 63, 94, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                                                    Ends: {new Date(job.deadline).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--gray-400)', marginBottom: '1.25rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {job.description}
                                    </p>
                                    <div className="skill-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
                                        {job.required_skills?.map((s, i) => <SkillTag key={i} skill={s} />)}
                                    </div>
                                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 500 }}>👤 {job.owner_name || 'HireFlow Team'}</span>
                                        <button className="action-btn primary-btn small-btn" style={{ padding: '0.5rem 1rem' }} onClick={() => {
                                            setApplyingJob(job);
                                            // Pre-select active resume if available
                                            const active = resumeHistory.find(r => r.is_active);
                                            if (active) setSelectedResumeId(active.id);
                                        }}>Apply Now</button>
                                    </div>
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
                                        <h3 style={{
                                            fontSize: '1rem',
                                            color: upskillingData.is_default ? 'var(--accent-400)' : 'var(--rose-400)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}>
                                            {upskillingData.is_default ? '✨ Your Learning Path' : '⚠️ Identified Gaps'}
                                        </h3>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '0.25rem' }}>
                                            {upskillingData.is_default ? 'Foundational & level-up courses:' : 'Skills you need to develop:'}
                                        </p>
                                        <div className="skill-gap-list">
                                            {upskillingData.recommendations.map((rec, i) => (
                                                <div key={i} className="skill-gap-item">
                                                    <div className="skill-gap-dot" style={{ background: upskillingData.is_default ? 'var(--accent-500)' : 'var(--rose-500)' }} />
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{rec.skill}</span>
                                                        {rec.category && <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>{rec.category}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="card glass-card" style={{ padding: '1.25rem' }}>
                                        <h3 style={{ fontSize: '1rem', color: 'var(--accent-400)' }}>💡 {upskillingData.is_default ? 'Personalized Tips' : 'Pro Tip'}</h3>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--gray-300)', marginTop: '0.5rem', lineHeight: '1.5' }}>
                                            {upskillingData.is_default
                                                ? "These courses are selected based on your current profile and industry foundational requirements to help you stay ahead."
                                                : "Complete a course and update your resume to automatically boost your matching score by up to 15% for this role."}
                                        </p>
                                    </div>
                                </div>

                                {/* Right Side: Recommendations */}
                                <div className="upskilling-main">
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                                        {upskillingData.is_default ? '🌟 Recommended for Your Profile' : '📚 Recommended Learning Paths'}
                                    </h3>
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

                            {/* Resume Selection */}
                            <div className="app-form-group">
                                <label className="app-form-label">📄 Attached Resume <span>(Select from your uploads)</span></label>
                                <select
                                    className="app-form-input"
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border-subtle)' }}
                                    value={selectedResumeId}
                                    onChange={e => setSelectedResumeId(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>Choose a resume to attach...</option>
                                    {resumeHistory.map(r => (
                                        <option key={r.id} value={r.id} style={{ background: '#1a1a1a' }}>
                                            {r.file_name} {r.is_active ? ' (Active)' : ''}
                                        </option>
                                    ))}
                                </select>
                                {resumeHistory.length === 0 && (
                                    <p style={{ color: 'var(--rose-400)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                                        ⚠️ Please upload a resume in the Upload tab first.
                                    </p>
                                )}
                            </div>

                            {/* Links & Availability */}
                            <div className="grid-2-cols">
                                <div className="app-form-group">
                                    <label className="app-form-label">🔗 Portfolio / LinkedIn</label>
                                    <input
                                        type="url"
                                        className="app-form-input"
                                        placeholder="https://..."
                                        value={portfolioUrl}
                                        onChange={e => setPortfolioUrl(e.target.value)}
                                    />
                                </div>
                                <div className="app-form-group">
                                    <label className="app-form-label">📅 Earliest Start Date</label>
                                    <input
                                        type="date"
                                        className="app-form-input"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                    />
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
            {/* Resume Viewer Modal */}
            <ResumeViewer
                isOpen={!!viewingResume}
                onClose={() => setViewingResume(null)}
                resumeUrl={viewingResume?.url}
                fileName={viewingResume?.file_name}
                entities={viewingResume?.entities}
                onUpdate={async (newEntities) => {
                    await api.updateProfile({ entities: newEntities });
                    loadProfile();
                }}
            />
            {/* Skill Test Modal */}
            <SkillTestModal
                isOpen={!!skillToTest}
                onClose={() => setSkillToTest(null)}
                skill={skillToTest}
                onComplete={() => {
                    loadProfile();
                    setSkillToTest(null);
                }}
            />
        </div>
    );
}
