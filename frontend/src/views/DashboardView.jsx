import React, { useState, useEffect } from 'react';
import SkillTag from '../components/SkillTag';
import ScoreBar from '../components/ScoreBar';
import { api } from '../api/client';

export default function DashboardView({ onStartInterview }) {
    const [jobDescription, setJobDescription] = useState('');
    const [topK, setTopK] = useState(10);
    const [candidates, setCandidates] = useState([]);
    const [fairness, setFairness] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState('');
    const [jobs, setJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [showCreateJob, setShowCreateJob] = useState(false);
    const [newJob, setNewJob] = useState({ title: '', description: '', required_skills: '' });

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const data = await api.listJobs();
            setJobs(data.jobs || []);
        } catch (e) { /* ignore */ }
    };

    const createJob = async () => {
        try {
            const data = await api.createJob({
                title: newJob.title,
                description: newJob.description,
                required_skills: newJob.required_skills.split(',').map(s => s.trim()).filter(Boolean),
            });
            setSelectedJobId(data.job_id);
            setJobDescription(newJob.description);
            setShowCreateJob(false);
            setNewJob({ title: '', description: '', required_skills: '' });
            fetchJobs();
        } catch (e) {
            setError('Failed to create job');
        }
    };

    const searchCandidates = async () => {
        if (!jobDescription.trim()) {
            setError('Please enter a job description');
            return;
        }

        setIsSearching(true);
        setError('');
        setCandidates([]);

        try {
            const data = await api.matchCandidates({
                job_description: jobDescription,
                top_k: topK,
            });
            setCandidates(data.candidates || []);
            setFairness(data.fairness || null);
        } catch (err) {
            setError(err.message || 'Failed to search candidates');
        } finally {
            setIsSearching(false);
        }
    };

    const maxScore = candidates.length > 0
        ? Math.max(...candidates.map(c => c.boosted_score || 0), 0.001)
        : 1;

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Recruiter Dashboard</h1>
                <p className="page-subtitle">
                    Search and rank candidates with AI-powered hybrid retrieval
                </p>
            </div>

            {/* Job Description Input */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                    <h3 className="card-title">Job Description</h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateJob(!showCreateJob)}>
                            {showCreateJob ? '✕ Close' : '+ Create Job'}
                        </button>
                    </div>
                </div>

                {showCreateJob && (
                    <div style={{
                        padding: '1rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)'
                    }}>
                        <input
                            value={newJob.title}
                            onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                            placeholder="Job title (e.g., Senior Python Developer)"
                            className="chat-input"
                            style={{ marginBottom: '0.5rem', width: '100%' }}
                        />
                        <textarea
                            value={newJob.description}
                            onChange={e => setNewJob({ ...newJob, description: e.target.value })}
                            placeholder="Job description..."
                            className="textarea"
                            style={{ marginBottom: '0.5rem', minHeight: '80px' }}
                        />
                        <input
                            value={newJob.required_skills}
                            onChange={e => setNewJob({ ...newJob, required_skills: e.target.value })}
                            placeholder="Required skills (comma separated)"
                            className="chat-input"
                            style={{ marginBottom: '0.5rem', width: '100%' }}
                        />
                        <button className="btn btn-accent btn-sm" onClick={createJob}>Save Job</button>
                    </div>
                )}

                {jobs.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--gray-400)', display: 'block', marginBottom: '0.375rem' }}>
                            Quick fill from saved jobs:
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {jobs.map(job => (
                                <button
                                    key={job.id}
                                    className={`btn btn-sm ${selectedJobId === job.id ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => { setSelectedJobId(job.id); setJobDescription(job.description); }}
                                >
                                    {job.title}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <textarea
                    className="textarea"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste a job description here to find matching candidates..."
                    rows={5}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                    <button
                        className="btn btn-primary"
                        onClick={searchCandidates}
                        disabled={isSearching || !jobDescription.trim()}
                    >
                        {isSearching ? <><span className="spinner" /> Searching...</> : '🔍 Search Candidates'}
                    </button>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--gray-400)' }}>
                        Top
                        <input
                            type="number"
                            value={topK}
                            onChange={(e) => setTopK(parseInt(e.target.value) || 10)}
                            min={1}
                            max={50}
                            style={{
                                width: '60px', padding: '0.375rem', background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)',
                                color: 'white', textAlign: 'center', fontFamily: 'inherit'
                            }}
                        />
                        results
                    </label>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    marginBottom: '1rem', padding: '1rem', borderRadius: 'var(--radius-md)',
                    background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: 'var(--rose-400)', fontSize: '0.9rem'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Fairness Warnings */}
            {fairness?.warnings?.length > 0 && (
                <div style={{
                    marginBottom: '1rem', padding: '1rem', borderRadius: 'var(--radius-md)',
                    background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)',
                    color: 'var(--warm-400)', fontSize: '0.9rem'
                }}>
                    ⚡ {fairness.warnings.join(' | ')}
                </div>
            )}

            {/* Results Table */}
            {candidates.length > 0 && (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <div className="card-header">
                        <h3 className="card-title">Matched Candidates ({candidates.length})</h3>
                        {fairness?.fairness_checks && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <span style={{
                                    fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-full)',
                                    background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)',
                                    color: 'var(--accent-400)'
                                }}>
                                    ✓ Fair Scoring
                                </span>
                            </div>
                        )}
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="results-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '50px' }}>Rank</th>
                                    <th>Candidate</th>
                                    <th>Matched Skills</th>
                                    <th style={{ width: '200px' }}>Boosted Score</th>
                                    <th style={{ width: '120px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {candidates.map((cand, idx) => (
                                    <tr key={cand.candidate_id}>
                                        <td>
                                            <span className={`rank-badge ${idx < 3 ? `rank-${idx + 1}` : 'rank-default'}`}>
                                                {idx + 1}
                                            </span>
                                        </td>
                                        <td>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.125rem' }}>
                                                    {cand.name || 'Unknown'}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontFamily: 'monospace' }}>
                                                    {cand.candidate_id?.substring(0, 8)}...
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="skill-tags">
                                                {(cand.matched_skills || []).slice(0, 5).map((skill, i) => (
                                                    <SkillTag key={i} skill={skill} variant="matched" />
                                                ))}
                                                {(cand.matched_skills || []).length > 5 && (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                                                        +{cand.matched_skills.length - 5}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <ScoreBar
                                                score={cand.boosted_score || 0}
                                                maxScore={maxScore}
                                                label=""
                                            />
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-accent btn-sm"
                                                onClick={() => onStartInterview && onStartInterview(cand.candidate_id, selectedJobId)}
                                                disabled={!selectedJobId}
                                                title={!selectedJobId ? 'Create or select a job first' : 'Start interview'}
                                            >
                                                🎙️ Interview
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!isSearching && candidates.length === 0 && !error && (
                <div style={{
                    textAlign: 'center', padding: '3rem', color: 'var(--gray-500)',
                    fontSize: '0.9rem'
                }}>
                    Enter a job description and click Search to find matching candidates
                </div>
            )}
        </div>
    );
}
