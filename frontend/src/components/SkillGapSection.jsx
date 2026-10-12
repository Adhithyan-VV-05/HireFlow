import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { BookOpen, CheckCircle, AlertTriangle, ExternalLink, Clock, Layers, Sparkles, RefreshCw, Award, Info, ChevronDown, ChevronUp } from 'lucide-react';

export default function SkillGapSection({
    candidates = [],
    jobs = [],
    selectedCandidateId = '',
    onCandidateSelect = () => {},
}) {
    // Keep local selection state synchronized
    const [candId, setCandId] = useState(selectedCandidateId || candidates[0]?.id || candidates[0]?.candidate_id || '');
    const [jobId, setJobId] = useState(jobs[0]?.id || '');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAllCandidateSkills, setShowAllCandidateSkills] = useState(false);

    // Sync candidate ID if prop changes
    useEffect(() => {
        if (selectedCandidateId && selectedCandidateId !== candId) {
            setCandId(selectedCandidateId);
        }
    }, [selectedCandidateId]);

    // Ensure valid candidate is selected when candidates array loads
    useEffect(() => {
        if (candidates.length > 0) {
            const hasValidCand = candidates.some(c => (c.id === candId || c.candidate_id === candId));
            if (!hasValidCand || !candId) {
                const nextId = candidates[0].id || candidates[0].candidate_id;
                setCandId(nextId);
            }
        }
    }, [candidates]);

    // Ensure valid job is selected when jobs array loads
    useEffect(() => {
        if (jobs.length > 0) {
            const hasValidJob = jobs.some(j => j.id === jobId);
            if (!hasValidJob || !jobId) {
                setJobId(jobs[0].id);
            }
        }
    }, [jobs]);

    // Trigger fetch whenever candId or jobId changes
    useEffect(() => {
        if (candId) {
            fetchGapAnalysis(jobId, candId);
        }
    }, [candId, jobId]);

    const fetchGapAnalysis = async (jId, cId) => {
        if (!cId) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.getUpskillingRecommendations(jId || undefined, cId);
            setData(res);
            // If backend auto-resolved a job_id and local jobId was empty, update it
            if (res?.selected_job?.id && !jId) {
                setJobId(res.selected_job.id);
            }
        } catch (err) {
            console.error('[SkillGapSection] Error fetching gap analysis:', err);
            setError(err.message || 'Failed to load skill gap analysis');
        } finally {
            setLoading(false);
        }
    };

    const currentCandidate = candidates.find(c => (c.id === candId || c.candidate_id === candId)) || candidates[0];
    const candidateSkillsList = data?.candidate_skills || currentCandidate?.skills || [];
    const candidateSkillsLower = new Set(candidateSkillsList.map(s => s.toLowerCase().trim()));

    const selectedJob = data?.selected_job || jobs.find(j => j.id === jobId) || null;
    const requiredSkills = selectedJob?.required_skills || [];
    const totalRequired = requiredSkills.length;

    // Use backend's accurate evaluation if available, otherwise strict fallback
    const matchedSkills = data?.matched_skills || requiredSkills.filter(s => candidateSkillsLower.has(s.toLowerCase().trim()));
    const missingSkills = data?.skill_gaps || requiredSkills.filter(s => !candidateSkillsLower.has(s.toLowerCase().trim()));

    // Strict mathematical match calculation
    const matchPct = totalRequired > 0
        ? (typeof data?.match_percentage === 'number' ? data.match_percentage : Math.round((matchedSkills.length / totalRequired) * 100))
        : 0;

    const scoreReasoning = data?.score_reasoning || {
        formula: totalRequired > 0
            ? `${matchedSkills.length} Matched ÷ ${totalRequired} Required × 100 = ${matchPct}%`
            : '0 Required Skills Configured for this role',
        matched_count: matchedSkills.length,
        gap_count: missingSkills.length,
        total_required: totalRequired,
        verdict: totalRequired === 0
            ? 'No Requirements Defined'
            : matchPct === 100
                ? '100% Perfect Alignment'
                : matchPct >= 80
                    ? 'High Role Alignment'
                    : matchPct >= 50
                        ? 'Moderate Role Alignment'
                        : matchPct > 0
                            ? 'Substantial Skill Gap'
                            : 'Zero Skill Match',
        verdict_color: totalRequired === 0
            ? 'slate'
            : matchPct >= 80
                ? 'emerald'
                : matchPct >= 50
                    ? 'amber'
                    : 'rose',
        reason: totalRequired === 0
            ? `Target job '${selectedJob?.title || 'Selected Role'}' has no required skills configured. Add skills to evaluate alignment.`
            : matchPct === 100
                ? `Exceptional match: Candidate fulfills all ${totalRequired} required competencies (100.0%) for ${selectedJob?.title || 'target role'}.`
                : `Candidate fulfills ${matchedSkills.length} of ${totalRequired} required competencies (${matchPct}%). ${missingSkills.length} skill gap(s) identified.`
    };

    // Skills breakdown: use backend itemized breakdown if available, else derive cleanly
    const skillBreakdown = (data?.skill_breakdown && data.skill_breakdown.length > 0)
        ? data.skill_breakdown
        : requiredSkills.map((reqSkill, idx) => {
            const isMet = candidateSkillsLower.has(reqSkill.toLowerCase().trim());
            const priority = idx === 0 ? 'Core Essential (Critical)' : (idx <= 2 ? 'Technical Competency (High)' : 'Applied Competency (Moderate)');
            const priorityCode = idx === 0 ? 'critical' : (idx <= 2 ? 'high' : 'moderate');
            return {
                skill: reqSkill,
                status: isMet ? 'matched' : 'gap',
                is_met: isMet,
                matched_by: isMet ? reqSkill : null,
                priority,
                priority_code: priorityCode,
                reason: isMet
                    ? `Verified in Profile: Candidate has demonstrated '${reqSkill}', fulfilling role criteria for ${selectedJob?.title || 'target job'}.`
                    : `Missing from Profile: Candidate's verified profile has no evidence of '${reqSkill}'. Required for ${selectedJob?.title || 'target job'} deliverables.`,
                role_impact: `Required competency for ${selectedJob?.title || 'this role'} to fulfill technical performance standards.`,
                learning_duration: isMet ? 'Proficient' : '2-3 weeks (Hands-on)',
            };
        });

    return (
        <div className="m4-card" id="skill-gap-section" style={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            {/* Header */}
            <div className="m4-card-header" style={{ paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                    <h2 className="m4-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        Skill Gap Analysis & Transparent Role Alignment
                    </h2>
                    <p className="m4-card-subtitle" style={{ marginTop: '0.25rem' }}>
                        Evidence-based mathematical verification comparing candidate competencies against target job requirements with transparent reasoning.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button
                        className="m4-btn m4-btn-secondary"
                        onClick={() => fetchGapAnalysis(jobId, candId)}
                        disabled={loading}
                        title="Recompute skill gap analysis"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Recalculate
                    </button>
                </div>
            </div>

            {/* Selectors Bar */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                gap: '1.25rem',
                backgroundColor: '#f8fafc',
                padding: '1.25rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                margin: '1.25rem 0'
            }}>
                <div className="m4-field-group">
                    <label className="m4-field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Candidate Profile</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                            {candidateSkillsList.length} Extracted Skills
                        </span>
                    </label>
                    <select
                        className="m4-select"
                        value={candId}
                        onChange={(e) => {
                            const newCandId = e.target.value;
                            setCandId(newCandId);
                            onCandidateSelect(newCandId);
                        }}
                    >
                        {candidates.map(c => {
                            const cVal = c.id || c.candidate_id;
                            return (
                                <option key={cVal} value={cVal}>
                                    {c.name} — {c.current_status || 'Applied'} ({c.skills?.length || 0} skills)
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div className="m4-field-group">
                    <label className="m4-field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Target Job Role</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                            {totalRequired} Required Skills
                        </span>
                    </label>
                    <select
                        className="m4-select"
                        value={jobId}
                        onChange={(e) => {
                            const newJobId = e.target.value;
                            setJobId(newJobId);
                        }}
                    >
                        {jobs.map(j => (
                            <option key={j.id} value={j.id}>
                                {j.title} ({j.required_skills?.length || 0} required skills)
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Candidate Extracted Skills Pill Drawer */}
            {candidateSkillsList.length > 0 && (
                <div style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1.25rem',
                    fontSize: '0.825rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 600 }}>
                            <Award className="w-4 h-4 text-indigo-600" />
                            <span>Candidate Verified Competencies ({candidateSkillsList.length} skills in profile)</span>
                        </div>
                        <button
                            onClick={() => setShowAllCandidateSkills(!showAllCandidateSkills)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#2563eb',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                            }}
                        >
                            {showAllCandidateSkills ? <>Hide Skills <ChevronUp className="w-3.5 h-3.5" /></> : <>Show All ({candidateSkillsList.length}) <ChevronDown className="w-3.5 h-3.5" /></>}
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.6rem' }}>
                        {(showAllCandidateSkills ? candidateSkillsList : candidateSkillsList.slice(0, 10)).map((skill, idx) => {
                            const isRequiredInRole = requiredSkills.some(rs => rs.toLowerCase() === skill.toLowerCase());
                            return (
                                <span
                                    key={idx}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        backgroundColor: isRequiredInRole ? '#dcfce7' : '#f1f5f9',
                                        color: isRequiredInRole ? '#15803d' : '#475569',
                                        border: isRequiredInRole ? '1px solid #86efac' : '1px solid #e2e8f0'
                                    }}
                                    title={isRequiredInRole ? 'Direct match for target job requirement!' : 'Candidate skill'}
                                >
                                    {isRequiredInRole && '✓ '}
                                    {skill}
                                </span>
                            );
                        })}
                        {!showAllCandidateSkills && candidateSkillsList.length > 10 && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b', alignSelf: 'center', paddingLeft: '0.25rem' }}>
                                +{candidateSkillsList.length - 10} more...
                            </span>
                        )}
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                    <p style={{ fontWeight: 600 }}>Evaluating candidate skills against target job specifications...</p>
                </div>
            ) : error ? (
                <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c' }}>
                    {error}
                </div>
            ) : (
                <>
                    {/* Overview Match Score & Summary */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                        gap: '1.5rem',
                        alignItems: 'center',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '1.25rem 1.5rem',
                        marginBottom: '1.25rem'
                    }}>
                        <div style={{ textAlign: 'center', minWidth: '130px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Role Skill Match
                            </div>
                            <div style={{
                                fontSize: '2.5rem',
                                fontWeight: 800,
                                color: totalRequired === 0 ? '#64748b' : matchPct >= 75 ? '#059669' : matchPct >= 50 ? '#d97706' : '#dc2626',
                                lineHeight: 1.1,
                                marginTop: '0.2rem'
                            }}>
                                {totalRequired === 0 ? 'N/A' : `${matchPct}%`}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 600 }}>
                                {totalRequired === 0
                                    ? '0 Requirements Configured'
                                    : `${matchedSkills.length} of ${totalRequired} Met`}
                            </div>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                <span style={{ color: '#0f172a' }}>Requirement Coverage</span>
                                <span style={{ color: '#64748b' }}>
                                    {totalRequired === 0
                                        ? 'No requirements listed'
                                        : `${matchedSkills.length} Met • ${missingSkills.length} Gaps`}
                                </span>
                            </div>
                            <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${matchPct}%`,
                                    backgroundColor: matchPct >= 75 ? '#10b981' : matchPct >= 50 ? '#f59e0b' : '#ef4444',
                                    borderRadius: '4px',
                                    transition: 'width 0.4s ease'
                                }} />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                                <div style={{ fontSize: '0.8rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <CheckCircle className="w-4 h-4" /> <strong>{matchedSkills.length}</strong> Matched Skills
                                </div>
                                <div style={{ fontSize: '0.8rem', color: missingSkills.length > 0 ? '#dc2626' : '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <AlertTriangle className="w-4 h-4" /> <strong>{missingSkills.length}</strong> Skill Gaps
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transparent Mathematical Formula & Reasoning Card */}
                    <div style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '1rem 1.25rem',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Info className="w-4 h-4 text-blue-600" />
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                                    Mathematical Calculation & Transparent Reasoning
                                </span>
                            </div>
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '0.2rem 0.65rem',
                                borderRadius: '12px',
                                backgroundColor: scoreReasoning.verdict_color === 'emerald' ? '#dcfce7' : scoreReasoning.verdict_color === 'amber' ? '#fef3c7' : scoreReasoning.verdict_color === 'slate' ? '#f1f5f9' : '#fee2e2',
                                color: scoreReasoning.verdict_color === 'emerald' ? '#166534' : scoreReasoning.verdict_color === 'amber' ? '#92400e' : scoreReasoning.verdict_color === 'slate' ? '#475569' : '#991b1b',
                                border: '1px solid currentColor'
                            }}>
                                Verdict: {scoreReasoning.verdict}
                            </span>
                        </div>

                        <div style={{
                            fontSize: '0.825rem',
                            color: '#334155',
                            lineHeight: 1.5,
                            backgroundColor: '#ffffff',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <div style={{ marginBottom: '0.3rem' }}>
                                <strong>Formula:</strong> <code style={{ backgroundColor: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#0f172a', fontWeight: 600 }}>{scoreReasoning.formula}</code>
                            </div>
                            <div>
                                <strong>Justification:</strong> {scoreReasoning.reason}
                            </div>
                        </div>
                    </div>

                    {/* Skills Breakdown Table */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                            Required Skills Breakdown & Evaluation Evidence
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {skillBreakdown.length} items evaluated for {selectedJob?.title || 'target job'}
                        </span>
                    </div>

                    {totalRequired === 0 ? (
                        <div style={{
                            padding: '2.5rem',
                            textAlign: 'center',
                            backgroundColor: '#f8fafc',
                            border: '1px dashed #cbd5e1',
                            borderRadius: '10px',
                            color: '#64748b',
                            marginBottom: '1.5rem'
                        }}>
                            <Info className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                            <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                                No Required Skills Listed for {selectedJob?.title || 'Selected Role'}
                            </div>
                            <div style={{ fontSize: '0.85rem', maxWidth: '480px', margin: '0 auto' }}>
                                Add required skill competencies to this job description in Job Management to generate role alignment scores and tailored upskilling pathways.
                            </div>
                        </div>
                    ) : (
                        <div className="m4-table-container" style={{ marginBottom: '1.5rem' }}>
                            <table className="m4-table">
                                <thead>
                                    <tr>
                                        <th>Required Skill</th>
                                        <th>Requirement Weight</th>
                                        <th>Candidate Profile Evidence</th>
                                        <th>Role Business Justification</th>
                                        <th>Status</th>
                                        <th>Learning Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {skillBreakdown.map((item, i) => {
                                        const isMet = Boolean(item.is_met);
                                        return (
                                            <tr key={i} style={{ backgroundColor: isMet ? '#ffffff' : '#fffbfb' }}>
                                                <td style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                                    {item.skill}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        color: item.priority_code === 'critical' ? '#1d4ed8' : item.priority_code === 'high' ? '#0369a1' : '#475569',
                                                        fontWeight: item.priority_code === 'critical' ? 700 : 600,
                                                        backgroundColor: item.priority_code === 'critical' ? '#eff6ff' : '#f8fafc',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '4px'
                                                    }}>
                                                        {item.priority || (i === 0 ? 'Core Essential' : 'Technical Competency')}
                                                    </span>
                                                </td>
                                                <td style={{ maxWidth: '240px' }}>
                                                    {isMet ? (
                                                        <div>
                                                            <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700, display: 'block' }}>
                                                                ✓ Verified in Profile
                                                            </span>
                                                            <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
                                                                Demonstrated "{item.matched_by || item.skill}"
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600, display: 'block' }}>
                                                                ✕ Missing from Profile
                                                            </span>
                                                            <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                                                                No verified evidence found
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ maxWidth: '280px', fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
                                                    {item.role_impact || `Essential capability for ${selectedJob?.title || 'target job'} deliverables.`}
                                                </td>
                                                <td>
                                                    {isMet ? (
                                                        <span className="m4-badge m4-badge-hired">
                                                            ✓ Met
                                                        </span>
                                                    ) : (
                                                        <span className="m4-badge m4-badge-rejected">
                                                            ✕ Missing Gap
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ fontSize: '0.8rem', color: isMet ? '#059669' : '#64748b', fontWeight: isMet ? 600 : 500, whiteSpace: 'nowrap' }}>
                                                    {isMet ? 'Proficient' : (item.learning_duration || '2-3 weeks')}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Recommended Training Pathways / 100% Alignment Notice */}
                    {totalRequired > 0 && missingSkills.length === 0 ? (
                        <div style={{
                            padding: '1.5rem',
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '10px',
                            textAlign: 'center',
                            color: '#166534'
                        }}>
                            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
                            <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.1rem', fontWeight: 800 }}>
                                🎉 100% Role Alignment — Zero Skill Gaps Detected!
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#15803d', maxWidth: '600px', marginInline: 'auto' }}>
                                Candidate fulfills all {totalRequired} required competencies for {selectedJob?.title || 'the target role'}. Ready for interview stages and deployment without preliminary upskilling requirements.
                            </p>
                        </div>
                    ) : missingSkills.length > 0 && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <Sparkles className="w-4 h-4 text-blue-600" />
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                    Tailored Development Pathways for Identified Gaps ({missingSkills.length} areas)
                                </h3>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1rem' }}>
                                {(data?.recommendations || []).map((rec, i) => (
                                    <div key={i} style={{
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '10px',
                                        padding: '1.25rem',
                                        backgroundColor: '#f8fafc',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                <span className="m4-missing-pill">
                                                    Missing: {rec.skill}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <Clock className="w-3.5 h-3.5" /> {rec.duration || '2-3 weeks'}
                                                </span>
                                            </div>

                                            <div style={{ fontSize: '0.825rem', color: '#334155', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                                                <strong>Why Needed:</strong> {rec.why_needed || `Required competency to fulfill ${selectedJob?.title || 'target role'} responsibilities.`}
                                            </div>

                                            {/* Recommended Courses list */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {(rec.courses || []).map((course, cIdx) => (
                                                    <a
                                                        key={cIdx}
                                                        href={course.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            textDecoration: 'none',
                                                            backgroundColor: '#ffffff',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '8px',
                                                            padding: '0.75rem 0.85rem',
                                                            fontSize: '0.8rem',
                                                            display: 'block',
                                                            transition: 'all 0.15s ease',
                                                            cursor: 'pointer'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.borderColor = '#4f46e5';
                                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(79, 70, 229, 0.08)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                                            e.currentTarget.style.boxShadow = 'none';
                                                        }}
                                                        title={`Open ${course.title} on ${course.provider}`}
                                                    >
                                                        <div style={{ fontWeight: 600, color: '#1e40af', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                                            <span style={{ lineHeight: 1.3 }}>{course.title}</span>
                                                            <span style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.2rem',
                                                                fontSize: '0.72rem',
                                                                fontWeight: 600,
                                                                color: '#4f46e5',
                                                                backgroundColor: '#eef2ff',
                                                                padding: '0.15rem 0.45rem',
                                                                borderRadius: '4px',
                                                                flexShrink: 0
                                                            }}>
                                                                Open Course <ExternalLink className="w-3 h-3" />
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', color: '#64748b', fontSize: '0.74rem' }}>
                                                            <span style={{ fontWeight: 600, color: '#334155' }}>
                                                                🏢 {course.provider || 'Coursera / edX'} • {course.level || 'Intermediate'}
                                                            </span>
                                                            <span style={{ color: '#059669', fontWeight: 600 }}>
                                                                ⏱️ {course.duration || '3-4 weeks'}
                                                            </span>
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
