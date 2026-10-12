import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import SkillTag from '../components/SkillTag';
import ScoreBar from '../components/ScoreBar';
import CandidateCard from '../components/CandidateCard';
import AptitudeChatbot from './AptitudeChatbot';
import ResumeViewer from '../components/ResumeViewer';
import SkillTestModal from '../components/SkillTestModal';
import InterviewSimulationRoom from '../components/InterviewSimulationRoom';
import VoiceScreeningSection from '../components/VoiceScreeningSection';
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
    const [simulations, setSimulations] = useState([]); // Milestone 3 AI Simulations
    const [activeSimSession, setActiveSimSession] = useState(null);
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

            // Fetch AI Simulations
            const profData = await api.getMyProfile().catch(() => null);
            if (profData?.profile?.candidate_id) {
                const simData = await api.getCandidateSimulations(profData.profile.candidate_id).catch(() => ({ simulations: [] }));
                setSimulations(simData.simulations || []);
            }
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

    const handleLaunchSimulation = (jobId = null, jobTitle = null, existingSessionId = null, numQuestions = 5) => {
        const job = allJobs.find(j => j.id === jobId) || (allJobs.length > 0 ? allJobs[0] : null);
        setActiveSimSession({
            sessionId: existingSessionId,
            jobId: jobId || job?.id,
            jobTitle: jobTitle || job?.title || 'Senior ML Engineer',
            interviewType: 'mixed',
            numQuestions: numQuestions || 5
        });
        setActiveTab('active-simulation');
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

    const downloadSkillGapReport = () => {
        if (!upskillingData) return;
        const dateStr = new Date().toLocaleString();
        const candidateName = profile?.name || user?.name || 'Candidate';
        const candidateEmail = profile?.email || user?.email || 'N/A';
        const jobTitle = upskillingData.selected_job ? upskillingData.selected_job.title : 'General Skill Path';
        const matchPct = upskillingData.skill_match_percentage || 0;

        const matched = upskillingData.matched_skills?.length > 0 ? upskillingData.matched_skills.join(', ') : 'None matched';
        const gaps = upskillingData.skill_gaps?.length > 0 ? upskillingData.skill_gaps.join(', ') : 'No gaps detected!';

        let coursesText = '';
        if (upskillingData.recommendations && upskillingData.recommendations.length > 0) {
            coursesText = upskillingData.recommendations.map(rec => {
                const courseList = rec.courses?.map(c => `    * Course: ${c.title}\n      Provider: ${c.provider} | Level: ${c.level || 'Intermediate'} | Duration: ${c.duration || '4-6 weeks'}\n      URL: ${c.url}`).join('\n') || '    No courses listed.';
                return `Skill Gap Area: ${rec.skill} (${rec.category || 'General'})\n${courseList}`;
            }).join('\n\n');
        } else {
            coursesText = 'No specific upskilling courses required at this time.';
        }

        let skillScoresText = 'No verified skill test scores recorded.';
        if (profile?.skill_scores && Object.keys(profile.skill_scores).length > 0) {
            skillScoresText = Object.entries(profile.skill_scores)
                .map(([s, val]) => `  - ${s}: ${val.toFixed(0)}%`)
                .join('\n');
        }

        const report = `================================================================================
             HIREFLOW AI - CANDIDATE SKILL GAP & JOB MATCHING REPORT
================================================================================
Generated On    : ${dateStr}
Candidate Name  : ${candidateName}
Email Address   : ${candidateEmail}
Target Job Role : ${jobTitle}
Skill Match %   : ${matchPct}%

--------------------------------------------------------------------------------
1. SKILL MATCH & GAP SUMMARY
--------------------------------------------------------------------------------
Matched Skills in Resume (${upskillingData.matched_skills?.length || 0}):
  ${matched}

Identified Skill Gaps (${upskillingData.skill_gaps?.length || 0}):
  ${gaps}

--------------------------------------------------------------------------------
2. AI-RECOMMENDED UPSKILLING & LEARNING PATH
--------------------------------------------------------------------------------
${coursesText}

--------------------------------------------------------------------------------
3. YOUR VERIFIED SKILL TEST SCORES
--------------------------------------------------------------------------------
${skillScoresText}

--------------------------------------------------------------------------------
4. CURRENT EXTRACTED PROFILE SKILLS
--------------------------------------------------------------------------------
${profile?.skills ? profile.skills.join(', ') : 'None'}

================================================================================
               HIREFLOW AI - PERSONALIZED CAREER REPORT
================================================================================`;

        const fileName = `Skill_Gap_Report_${jobTitle.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
                <button className={`tab-btn ${activeTab === 'voice' ? 'active' : ''}`} onClick={() => setActiveTab('voice')}>🗣️ Voice Screening</button>
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

                        {/* Milestone 3: Scheduled / Active Interview Card in Candidate Profile */}
                        {simulations.filter(s => s.status === 'scheduled' || s.status === 'in_progress').map(sim => (
                            <div key={sim.session_id} className="card glass-card" style={{
                                marginTop: '1.5rem',
                                marginBottom: '2rem',
                                padding: '1.75rem',
                                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)',
                                border: '1px solid rgba(236, 72, 153, 0.4)',
                                borderRadius: '16px',
                                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                            width: '42px',
                                            height: '42px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.4rem'
                                        }}>
                                            🎙️
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f472b6', fontWeight: 800 }}>
                                                INTERVIEW {sim.status === 'scheduled' ? 'INVITATION' : 'SESSION'}
                                            </span>
                                            <h3 style={{ margin: 0, fontSize: '1.35rem', color: '#fff' }}>{sim.job_title || 'Role Interview'}</h3>
                                        </div>
                                    </div>
                                    <span style={{
                                        background: sim.status === 'scheduled' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(236, 72, 153, 0.25)',
                                        color: sim.status === 'scheduled' ? '#fbbf24' : '#f472b6',
                                        border: `1px solid ${sim.status === 'scheduled' ? 'rgba(251, 191, 36, 0.4)' : '#ec4899'}`,
                                        padding: '0.35rem 0.85rem',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase'
                                    }}>
                                        Status: {sim.status === 'scheduled' ? 'Scheduled' : 'In Progress'}
                                    </span>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                    gap: '1rem',
                                    background: 'rgba(0, 0, 0, 0.25)',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    marginBottom: '1.5rem',
                                    border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Role</div>
                                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{sim.job_title || 'Technical Role'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Company</div>
                                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>HireFlow</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Questions</div>
                                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{sim.question_count || 10} Questions</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Duration</div>
                                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>~30 minutes</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Scheduled</div>
                                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                                            {sim.created_at ? new Date(sim.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '23 September 2026'}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--gray-300)' }}>
                                        {sim.status === 'scheduled' ? '⚡ Complete question set ready. Click to begin.' : `Question ${(sim.current_question_index || 0) + 1} of ${sim.question_count} in progress.`}
                                    </span>
                                    <button
                                        className="hub-btn hub-btn-primary"
                                        style={{
                                            padding: '0.75rem 1.75rem',
                                            fontSize: '1rem',
                                            fontWeight: 800,
                                            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                                            boxShadow: '0 4px 20px rgba(236, 72, 153, 0.4)'
                                        }}
                                        onClick={() => handleLaunchSimulation(sim.job_id, sim.job_title, sim.session_id, sim.question_count)}
                                    >
                                        {sim.status === 'scheduled' ? '🚀 [ Start Interview ]' : 'Continue Interview ➔'}
                                    </button>
                                </div>
                            </div>
                        ))}

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

                                {/* Structured Academic & Education Background */}
                                <div className="card glass-card" style={{ marginTop: '1.5rem' }}>
                                    <div className="card-header-fancy">
                                        <h3>🎓 Academic & Education Background</h3>
                                        <span className="header-icon">🏛️</span>
                                    </div>
                                    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {(profile?.education && profile.education.length > 0) ? (
                                            profile.education.map((edu, idx) => (
                                                <div key={idx} style={{
                                                    padding: '1rem',
                                                    background: 'rgba(255, 255, 255, 0.02)',
                                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                                    borderRadius: '10px'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>{edu.degree || 'Degree'}</div>
                                                            <div style={{ color: 'var(--accent-400)', fontSize: '0.85rem' }}>{edu.institution || 'University'}</div>
                                                        </div>
                                                        {edu.year && (
                                                            <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                                                                📅 {edu.year}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {edu.major && (
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '0.4rem' }}>
                                                            Major: <span style={{ color: 'var(--gray-300)' }}>{edu.major}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="muted-text">Upload your resume to automatically extract structured education records.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Structured Professional Work Experience */}
                                <div className="card glass-card" style={{ marginTop: '1.5rem' }}>
                                    <div className="card-header-fancy">
                                        <h3>💼 Professional Work Experience</h3>
                                        <span className="header-icon">🏢</span>
                                    </div>
                                    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {(profile?.experience && profile.experience.length > 0) ? (
                                            profile.experience.map((exp, idx) => (
                                                <div key={idx} style={{
                                                    padding: '1rem',
                                                    background: 'rgba(255, 255, 255, 0.02)',
                                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                                    borderRadius: '10px'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>{exp.title || 'Role'}</div>
                                                            <div style={{ color: 'var(--accent-400)', fontSize: '0.85rem' }}>{exp.company || 'Company'}</div>
                                                        </div>
                                                        {exp.duration && (
                                                            <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                                                                ⏱️ {exp.duration}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {exp.responsibilities && exp.responsibilities.length > 0 && (
                                                        <ul style={{ margin: '0.6rem 0 0 1.2rem', padding: 0, fontSize: '0.8rem', color: 'var(--gray-400)', lineHeight: '1.5' }}>
                                                            {exp.responsibilities.slice(0, 3).map((r, ri) => (
                                                                <li key={ri}>{r}</li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="muted-text">Upload your resume to automatically extract structured employment experience.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Structured Technical Projects */}
                                <div className="card glass-card" style={{ marginTop: '1.5rem' }}>
                                    <div className="card-header-fancy">
                                        <h3>🚀 Technical Projects & Portfolios</h3>
                                        <span className="header-icon">💻</span>
                                    </div>
                                    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {(profile?.projects && profile.projects.length > 0) ? (
                                            profile.projects.map((proj, idx) => (
                                                <div key={idx} style={{
                                                    padding: '1rem',
                                                    background: 'rgba(255, 255, 255, 0.02)',
                                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                                    borderRadius: '10px'
                                                }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>{proj.name}</div>
                                                    {proj.description && (
                                                        <p style={{ fontSize: '0.82rem', color: 'var(--gray-400)', margin: '0.4rem 0', lineHeight: '1.5' }}>
                                                            {proj.description}
                                                        </p>
                                                    )}
                                                    {proj.tech_stack && proj.tech_stack.length > 0 && (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                                                            {proj.tech_stack.map((t, ti) => (
                                                                <span key={ti} style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.06)', color: 'var(--gray-300)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                                                                    {t}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="muted-text">Upload your resume to automatically extract project portfolios.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Structured Certifications & Credentials */}
                                <div className="card glass-card" style={{ marginTop: '1.5rem' }}>
                                    <div className="card-header-fancy">
                                        <h3>📜 Certifications & Credentials</h3>
                                        <span className="header-icon">🎖️</span>
                                    </div>
                                    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {(profile?.certifications && profile.certifications.length > 0) ? (
                                            profile.certifications.map((cert, idx) => (
                                                <div key={idx} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '0.85rem 1rem',
                                                    background: 'rgba(255, 255, 255, 0.02)',
                                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                                    borderRadius: '10px'
                                                }}>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>{cert.name}</div>
                                                        <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>Issued by: {cert.issuer || 'Verified Provider'}</div>
                                                    </div>
                                                    {cert.year && (
                                                        <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}>
                                                            {cert.year}
                                                        </span>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="muted-text">Upload your resume to automatically extract certifications.</p>
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
                                                    <div className="activity-meta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                            <span className={`status-pill pill-${app.status}`}>{app.status}</span>
                                                            <span className="activity-date">{new Date(app.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                        <button
                                                            className="hub-btn hub-btn-primary"
                                                            style={{ padding: '0.15rem 0.5rem', fontSize: '0.68rem', borderRadius: '4px' }}
                                                            onClick={() => setActiveTab('voice')}
                                                        >
                                                            🗣️ Voice Test
                                                        </button>
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
                                    <div className="summary-stat-row">
                                        <span>🗣️ Voice Screening</span>
                                        {profile?.screening_score ? (
                                            <strong style={{ color: profile.screening_score >= 75 ? 'var(--emerald-400)' : 'var(--amber-400)' }}>
                                                {profile.screening_score.toFixed(0)}% ({profile.screening_recommendation || 'Screened'})
                                            </strong>
                                        ) : (
                                            <button
                                                className="hub-btn hub-btn-primary"
                                                style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem', borderRadius: '6px' }}
                                                onClick={() => setActiveTab('voice')}
                                            >
                                                Take Voice Test ➔
                                            </button>
                                        )}
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

                                {/* Section 3: AI Screenings & Full Simulations */}
                                <div className="hub-section">
                                    <div className="hub-section-header">
                                        <div>
                                            <h3 className="hub-section-title"><span>🤖</span> AI Interview Simulations (Milestone 3)</h3>
                                            <p className="muted-text" style={{ fontSize: '0.85rem' }}>
                                                Interactive question-by-question technical screenings with real-time AI scoring and ATS synchronization.
                                            </p>
                                        </div>
                                        <button
                                            className="hub-btn hub-btn-primary"
                                            style={{ width: 'auto', padding: '0.55rem 1.25rem', whiteSpace: 'nowrap' }}
                                            onClick={() => handleLaunchSimulation(null, 'Senior ML Engineer')}
                                        >
                                            🚀 Start AI Interview Simulation
                                        </button>
                                    </div>

                                    {/* Simulations Grid */}
                                    <div className="hub-grid" style={{ marginBottom: '2rem' }}>
                                        {simulations.length === 0 ? (
                                            <div className="card glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2.5rem', borderStyle: 'dashed' }}>
                                                <p className="muted-text" style={{ margin: 0, marginBottom: '0.75rem' }}>
                                                    No AI interview simulations attempted yet.
                                                </p>
                                                <button
                                                    className="hub-btn hub-btn-primary"
                                                    style={{ display: 'inline-block' }}
                                                    onClick={() => handleLaunchSimulation(null, 'Senior ML Engineer')}
                                                >
                                                    Start Simulation for Senior ML Engineer
                                                </button>
                                            </div>
                                        ) : (
                                            simulations.map(sim => (
                                                <div key={sim.session_id} className="hub-card">
                                                    <span className={`hub-badge ${sim.status === 'completed' ? 'tag-ai' : sim.status === 'scheduled' ? 'tag-invitation' : 'tag-video'}`} style={{
                                                        background: sim.status === 'scheduled' ? 'rgba(251, 191, 36, 0.2)' : undefined,
                                                        color: sim.status === 'scheduled' ? '#fbbf24' : undefined,
                                                        borderColor: sim.status === 'scheduled' ? 'rgba(251, 191, 36, 0.4)' : undefined
                                                    }}>
                                                        {sim.status === 'completed' ? '✓ Evaluated & Synced' : sim.status === 'scheduled' ? '📅 Scheduled by HR' : '⚡ In Progress'}
                                                    </span>
                                                    <h4 className="hub-card-title">{sim.job_title}</h4>

                                                    {sim.status === 'completed' ? (
                                                        <div className="hub-card-info">
                                                            <div className="ai-score-badge">
                                                                <span className="ai-score-value">{sim.overall_score}%</span>
                                                                <span className="ai-score-label">Final Evaluation Score</span>
                                                            </div>
                                                            <div className="hub-card-actions">
                                                                <button
                                                                    className="hub-btn hub-btn-secondary"
                                                                    style={{ width: '100%' }}
                                                                    onClick={() => handleLaunchSimulation(sim.job_id, sim.job_title, sim.session_id, sim.question_count)}
                                                                >
                                                                    View Full Report & Feedback
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : sim.status === 'scheduled' ? (
                                                        <div className="hub-card-info">
                                                            <p style={{ fontSize: '0.85rem', color: 'var(--gray-300)', margin: '0.5rem 0' }}>
                                                                {sim.question_count || 5} Questions • Est. 30 mins • Pre-generated & Saved
                                                            </p>
                                                            <div className="hub-card-actions">
                                                                <button
                                                                    className="hub-btn hub-btn-primary"
                                                                    style={{
                                                                        width: '100%',
                                                                        background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                                                                        fontWeight: 800
                                                                    }}
                                                                    onClick={() => handleLaunchSimulation(sim.job_id, sim.job_title, sim.session_id, sim.question_count)}
                                                                >
                                                                    🚀 [ Start Interview ]
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="hub-card-info">
                                                            <p style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>
                                                                Question {sim.current_question_index + 1} of {sim.question_count} pending.
                                                            </p>
                                                            <div className="hub-card-actions">
                                                                <button
                                                                    className="hub-btn hub-btn-primary"
                                                                    style={{ width: '100%' }}
                                                                    onClick={() => handleLaunchSimulation(sim.job_id, sim.job_title, sim.session_id, sim.question_count)}
                                                                >
                                                                    Resume Interview ➔
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Voice Screening Quick Card */}
                                    <div className="card glass-card" style={{
                                        marginBottom: '1.75rem',
                                        padding: '1.25rem 1.5rem',
                                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
                                        border: '1px solid rgba(99, 102, 241, 0.25)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '1rem'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                <span style={{ fontSize: '1.25rem' }}>🎙️</span>
                                                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>
                                                    Interactive Oral Voice Screening
                                                </h4>
                                                <span className="hub-badge tag-ai">Speech-to-Text Live</span>
                                            </div>
                                            <p className="muted-text" style={{ margin: 0, fontSize: '0.85rem' }}>
                                                Practice oral screening questions with real-time speech recognition, AI spoken prompts, and 5-dimension evaluation.
                                            </p>
                                        </div>
                                        <button
                                            className="hub-btn hub-btn-primary"
                                            style={{ width: 'auto', padding: '0.6rem 1.25rem', whiteSpace: 'nowrap' }}
                                            onClick={() => setActiveTab('voice')}
                                        >
                                            🗣️ Launch Voice Screening
                                        </button>
                                    </div>

                                    {/* Practice Screenings Header */}
                                    <div className="hub-section-header" style={{ marginTop: '1rem' }}>
                                        <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--gray-300)' }}>
                                            💬 Conversational Practice Sessions
                                        </h4>
                                        <button className="hub-btn hub-btn-secondary" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => startAIInterview(null)}>
                                            + Practice Chatbot
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

                {/* ACTIVE AI SIMULATION INTERVIEW (MILESTONE 3) */}
                {activeTab === 'active-simulation' && (
                    <div className="portal-section">
                        <InterviewSimulationRoom
                            sessionId={activeSimSession?.sessionId}
                            candidateId={profile?.candidate_id}
                            jobId={activeSimSession?.jobId}
                            jobTitle={activeSimSession?.jobTitle}
                            interviewType={activeSimSession?.interviewType || 'mixed'}
                            numQuestions={activeSimSession?.numQuestions || 5}
                            onClose={() => {
                                setActiveTab('interviews');
                                setActiveSimSession(null);
                                loadInterviews();
                                loadProfile();
                            }}
                        />
                    </div>
                )}

                {/* VOICE SCREENING TAB */}
                {activeTab === 'voice' && (
                    <div className="portal-section voice-portal-section-wrapper">
                        <div className="candidate-voice-portal-hero">
                            <div className="candidate-voice-hero-left">
                                <div className="candidate-voice-icon-circle">
                                    🗣️
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>
                                            Candidate Oral Voice Screening Room
                                        </h3>
                                        <span className="hub-badge tag-ai">Speech-to-Text Live</span>
                                    </div>
                                    <p className="muted-text" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                                        Experience live AI spoken questions, word-by-word heard audio tracking, and instant speech recognition projected lively as you speak.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <VoiceScreeningSection
                            isCandidateMode={true}
                            candidateProfile={profile || { id: user?.id, name: user?.name, email: user?.email }}
                            candidates={profile ? [profile] : [{ id: user?.id || 'demo-candidate', name: user?.name || 'Candidate', email: user?.email || '' }]}
                            jobs={allJobs}
                            selectedCandidateId={profile?.id || profile?.candidate_id || user?.id}
                            onCandidateUpdated={() => {
                                loadProfile();
                                loadInterviews();
                                loadMyApplications();
                            }}
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
                                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                        <button className="action-btn ghost-btn small-btn" onClick={() => {
                                            setSelectedJobId(job.id);
                                            setActiveTab('upskilling');
                                            loadUpskilling(job.id);
                                        }}>
                                            🎯 Skill Gap Report
                                        </button>
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
                                <h2>🚀 Career Growth & Skill Gap Analysis</h2>
                                <p className="muted-text">Bridge your genuine skill gaps with AI-curated learning paths tailored to target roles.</p>
                            </div>
                        </div>

                        <div className="card glass-card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '300px' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginBottom: '0.5rem', display: 'block' }}>Target Career Role for Skill Gap Analysis</label>
                                    <select
                                        className="form-input"
                                        style={{ width: '100%', cursor: 'pointer' }}
                                        value={selectedJobId}
                                        onChange={e => {
                                            setSelectedJobId(e.target.value);
                                            loadUpskilling(e.target.value);
                                        }}
                                    >
                                        <option value="">Select a role to analyze skill gap...</option>
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

                        {/* Genuine Skill Gap Report Banner */}
                        {upskillingData?.selected_job && (
                            <div className="card glass-card" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.05))', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                                            <span className="hub-badge tag-invitation">Genuine Skill Gap Report</span>
                                            <button
                                                className="hub-btn hub-btn-primary"
                                                style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem', borderRadius: '6px' }}
                                                onClick={downloadSkillGapReport}
                                            >
                                                📥 Download Skill Gap Report (.txt)
                                            </button>
                                        </div>
                                        <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{upskillingData.selected_job.title}</h3>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: upskillingData.skill_match_percentage >= 70 ? 'var(--emerald-400)' : 'var(--amber-400)' }}>
                                            {upskillingData.skill_match_percentage}% Skill Match
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                                            {upskillingData.matched_skills?.length || 0} of {upskillingData.selected_job.required_skills?.length || 0} required skills matched in your resume
                                        </div>
                                    </div>
                                </div>

                                <div className="skill-gap-analysis" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div className="skill-set-group" style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                                        <h4 style={{ color: 'var(--emerald-400)', margin: '0 0 0.75rem 0' }}>✅ Matched Resume Skills ({upskillingData.matched_skills?.length || 0})</h4>
                                        <div className="skill-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {upskillingData.matched_skills?.map((skill, i) => (
                                                <SkillTag key={i} skill={skill} className="matched-pill" />
                                            ))}
                                            {(!upskillingData.matched_skills || upskillingData.matched_skills.length === 0) && (
                                                <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', margin: 0 }}>No direct keyword skill matches found in your active resume.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="skill-set-group" style={{ background: 'rgba(244, 63, 94, 0.05)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(244, 63, 94, 0.15)' }}>
                                        <h4 style={{ color: 'var(--rose-400)', margin: '0 0 0.75rem 0' }}>❌ Missing Skill Gaps ({upskillingData.skill_gaps?.length || 0})</h4>
                                        <div className="skill-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {upskillingData.skill_gaps?.map((skill, i) => (
                                                <SkillTag key={i} skill={skill} className="missing-pill" />
                                            ))}
                                            {(!upskillingData.skill_gaps || upskillingData.skill_gaps.length === 0) && (
                                                <p style={{ fontSize: '0.8rem', color: 'var(--emerald-400)', margin: 0 }}>🎉 Perfect skill alignment! No skill gaps detected for this role.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

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
