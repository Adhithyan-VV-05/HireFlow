import { useState } from 'react';
import {
    Shield,
    Eye,
    Scale,
    Users,
    Brain,
    AlertTriangle,
    CheckCircle,
    FileSearch,
    Target,
    TrendingUp,
    Info,
    AlertCircle,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { Layout } from '../components/layout';
import { Button, Card, CardHeader, CardTitle, ProgressBar } from '../components/ui';
import { candidates } from '../data/candidates';

/**
 * Fairness & Transparency Panel
 * Shows explainable AI decisions and ethical AI compliance
 */
const FairnessPanel = () => {
    const [expandedCandidate, setExpandedCandidate] = useState(null);
    const [selectedCandidate, setSelectedCandidate] = useState(candidates[0]);

    // Fairness metrics
    const fairnessMetrics = [
        {
            name: 'Gender Neutrality',
            score: 98,
            description: 'Names and gender indicators are excluded from initial screening',
        },
        {
            name: 'Age Bias Prevention',
            score: 95,
            description: 'Graduation years and age-related data are anonymized',
        },
        {
            name: 'Geographic Fairness',
            score: 92,
            description: 'Location is only used for role requirements, not discrimination',
        },
        {
            name: 'Education Equity',
            score: 88,
            description: 'Focus on skills over prestige of educational institutions',
        },
    ];

    // Bias reduction techniques
    const biasReductionTechniques = [
        {
            icon: FileSearch,
            title: 'Blind Resume Screening',
            description: 'Personal identifying information is hidden during initial AI analysis to ensure skills-based evaluation.',
        },
        {
            icon: Target,
            title: 'Skill-Based Matching',
            description: 'Candidates are scored purely on skill alignment with job requirements, not demographic factors.',
        },
        {
            icon: TrendingUp,
            title: 'Standardized Scoring',
            description: 'All candidates are evaluated using the same criteria and weight factors for consistency.',
        },
        {
            icon: Users,
            title: 'Diverse Training Data',
            description: 'AI models are trained on diverse datasets to minimize historical bias patterns.',
        },
    ];

    // Decision factors for the selected candidate
    const getDecisionFactors = (candidate) => [
        {
            factor: 'Skills Match',
            value: candidate.skillsMatch,
            weight: 35,
            impact: candidate.skillsMatch >= 70 ? 'positive' : 'negative',
            explanation: `Candidate matches ${candidate.skillsMatch}% of required skills for the position.`,
        },
        {
            factor: 'Experience Level',
            value: candidate.experienceMatch,
            weight: 25,
            impact: candidate.experienceMatch >= 70 ? 'positive' : 'neutral',
            explanation: `${candidate.experience} years of experience in relevant field.`,
        },
        {
            factor: 'Education Fit',
            value: candidate.educationMatch,
            weight: 20,
            impact: candidate.educationMatch >= 70 ? 'positive' : 'neutral',
            explanation: `Educational background aligns with role requirements.`,
        },
        {
            factor: 'Overall AI Score',
            value: candidate.aiScore,
            weight: 20,
            impact: candidate.aiScore >= 75 ? 'positive' : candidate.aiScore >= 50 ? 'neutral' : 'negative',
            explanation: `Composite score based on all evaluation criteria.`,
        },
    ];

    return (
        <Layout>
            <div className="bg-slate-50 min-h-screen">
                {/* Page Header */}
                <div className="bg-gradient-hero text-white">
                    <div className="container-custom py-12">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                <Shield className="w-7 h-7" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold">
                                    Fairness & Transparency
                                </h1>
                                <p className="text-primary-200">
                                    Ethical AI compliance and explainable decisions
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container-custom py-8">
                    {/* Fairness Metrics */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {fairnessMetrics.map((metric, index) => (
                            <Card key={index} hover>
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-slate-800">{metric.name}</h3>
                                        <span className={`text-2xl font-bold ${metric.score >= 90 ? 'text-green-600' : 'text-amber-600'
                                            }`}>
                                            {metric.score}%
                                        </span>
                                    </div>
                                    <ProgressBar
                                        value={metric.score}
                                        color={metric.score >= 90 ? 'success' : 'warning'}
                                        showLabel={false}
                                        size="sm"
                                    />
                                    <p className="text-sm text-slate-500 mt-3">
                                        {metric.description}
                                    </p>
                                </div>
                            </Card>
                        ))}
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Explainable AI Section */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Selected Candidate Decision Explanation */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <Eye className="w-5 h-5 text-primary-600" />
                                            Decision Explanation
                                        </CardTitle>
                                        <select
                                            value={selectedCandidate.id}
                                            onChange={(e) => setSelectedCandidate(
                                                candidates.find(c => c.id === parseInt(e.target.value))
                                            )}
                                            className="input w-auto text-sm"
                                        >
                                            {candidates.map(candidate => (
                                                <option key={candidate.id} value={candidate.id}>
                                                    {candidate.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </CardHeader>
                                <div className="px-6 pb-6">
                                    {/* Candidate Summary */}
                                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl mb-6">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-semibold">
                                            {selectedCandidate.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-slate-800">
                                                {selectedCandidate.name}
                                            </h4>
                                            <p className="text-sm text-slate-500">
                                                {selectedCandidate.currentRole}
                                            </p>
                                        </div>
                                        <div className={`px-4 py-2 rounded-lg font-semibold ${selectedCandidate.status === 'shortlisted'
                                                ? 'bg-green-100 text-green-700'
                                                : selectedCandidate.status === 'interview'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                            {selectedCandidate.status.charAt(0).toUpperCase() + selectedCandidate.status.slice(1)}
                                        </div>
                                    </div>

                                    {/* Why Selected/Rejected */}
                                    <div className={`p-4 rounded-xl mb-6 ${selectedCandidate.status === 'rejected'
                                            ? 'bg-red-50 border border-red-200'
                                            : 'bg-green-50 border border-green-200'
                                        }`}>
                                        <div className="flex items-start gap-3">
                                            {selectedCandidate.status === 'rejected' ? (
                                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                            )}
                                            <div>
                                                <h4 className={`font-semibold ${selectedCandidate.status === 'rejected' ? 'text-red-800' : 'text-green-800'
                                                    }`}>
                                                    {selectedCandidate.status === 'rejected'
                                                        ? 'Why Not Selected'
                                                        : 'Why Selected'
                                                    }
                                                </h4>
                                                <p className={
                                                    selectedCandidate.status === 'rejected' ? 'text-red-700' : 'text-green-700'
                                                }>
                                                    {selectedCandidate.aiJustification}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Decision Factors Breakdown */}
                                    <h4 className="font-semibold text-slate-800 mb-4">Decision Factors</h4>
                                    <div className="space-y-4">
                                        {getDecisionFactors(selectedCandidate).map((factor, index) => (
                                            <div key={index} className="border border-slate-200 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`w-2 h-2 rounded-full ${factor.impact === 'positive' ? 'bg-green-500' :
                                                                factor.impact === 'negative' ? 'bg-red-500' :
                                                                    'bg-amber-500'
                                                            }`} />
                                                        <span className="font-medium text-slate-800">{factor.factor}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm text-slate-500">
                                                            Weight: {factor.weight}%
                                                        </span>
                                                        <span className={`font-semibold ${factor.value >= 80 ? 'text-green-600' :
                                                                factor.value >= 60 ? 'text-primary-600' :
                                                                    'text-amber-600'
                                                            }`}>
                                                            {factor.value}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <ProgressBar
                                                    value={factor.value}
                                                    color="auto"
                                                    showLabel={false}
                                                    size="sm"
                                                />
                                                <p className="text-sm text-slate-600 mt-2">
                                                    {factor.explanation}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>

                            {/* All Candidates Quick View */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Brain className="w-5 h-5 text-primary-600" />
                                        AI Decisions Overview
                                    </CardTitle>
                                </CardHeader>
                                <div className="px-6 pb-6">
                                    <div className="space-y-3">
                                        {candidates.slice(0, 5).map((candidate) => (
                                            <div
                                                key={candidate.id}
                                                className="border border-slate-200 rounded-xl overflow-hidden"
                                            >
                                                <button
                                                    onClick={() => setExpandedCandidate(
                                                        expandedCandidate === candidate.id ? null : candidate.id
                                                    )}
                                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center text-white text-sm font-semibold">
                                                            {candidate.name.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="font-medium text-slate-800">{candidate.name}</p>
                                                            <p className="text-sm text-slate-500">{candidate.aiRecommendation}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${candidate.status === 'shortlisted'
                                                                ? 'bg-green-100 text-green-700'
                                                                : candidate.status === 'interview'
                                                                    ? 'bg-blue-100 text-blue-700'
                                                                    : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {candidate.status}
                                                        </span>
                                                        {expandedCandidate === candidate.id
                                                            ? <ChevronUp className="w-5 h-5 text-slate-400" />
                                                            : <ChevronDown className="w-5 h-5 text-slate-400" />
                                                        }
                                                    </div>
                                                </button>

                                                {expandedCandidate === candidate.id && (
                                                    <div className="px-4 pb-4 pt-0 bg-slate-50 border-t border-slate-100">
                                                        <p className="text-sm text-slate-600 py-3">
                                                            {candidate.aiJustification}
                                                        </p>
                                                        <div className="grid grid-cols-3 gap-3">
                                                            <div className="text-center p-2 bg-white rounded-lg">
                                                                <div className="text-lg font-bold text-primary-600">
                                                                    {candidate.skillsMatch}%
                                                                </div>
                                                                <div className="text-xs text-slate-500">Skills</div>
                                                            </div>
                                                            <div className="text-center p-2 bg-white rounded-lg">
                                                                <div className="text-lg font-bold text-primary-600">
                                                                    {candidate.experience}yr
                                                                </div>
                                                                <div className="text-xs text-slate-500">Experience</div>
                                                            </div>
                                                            <div className="text-center p-2 bg-white rounded-lg">
                                                                <div className="text-lg font-bold text-primary-600">
                                                                    {candidate.aiScore}
                                                                </div>
                                                                <div className="text-xs text-slate-500">AI Score</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Right Column - Bias Reduction & Reminders */}
                        <div className="space-y-6">
                            {/* Bias Reduction Techniques */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Scale className="w-5 h-5 text-primary-600" />
                                        Bias Reduction
                                    </CardTitle>
                                </CardHeader>
                                <div className="px-6 pb-6 space-y-4">
                                    {biasReductionTechniques.map((technique, index) => {
                                        const Icon = technique.icon;
                                        return (
                                            <div key={index} className="flex gap-3">
                                                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <Icon className="w-5 h-5 text-primary-600" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-slate-800 text-sm">
                                                        {technique.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {technique.description}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>

                            {/* Human-in-the-Loop Reminder */}
                            <Card className="bg-amber-50 border-amber-200">
                                <div className="p-6">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                                        <div>
                                            <h3 className="font-semibold text-amber-900 mb-2">
                                                Human-in-the-Loop
                                            </h3>
                                            <p className="text-sm text-amber-800 mb-4">
                                                AI recommendations are designed to assist, not replace,
                                                human decision-making. All final hiring decisions should
                                                be made by qualified human recruiters.
                                            </p>
                                            <ul className="text-sm text-amber-700 space-y-2">
                                                <li className="flex items-center gap-2">
                                                    <CheckCircle className="w-4 h-4" />
                                                    Review AI recommendations critically
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <CheckCircle className="w-4 h-4" />
                                                    Consider context AI may miss
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <CheckCircle className="w-4 h-4" />
                                                    Make final decisions thoughtfully
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Ethical Guidelines */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Info className="w-5 h-5 text-primary-600" />
                                        Ethical Guidelines
                                    </CardTitle>
                                </CardHeader>
                                <div className="px-6 pb-6">
                                    <ul className="space-y-3 text-sm text-slate-600">
                                        <li className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2" />
                                            <span>All candidates are evaluated on merit and job-relevant criteria only</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2" />
                                            <span>Protected characteristics are never used in scoring algorithms</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2" />
                                            <span>Candidates can request explanation of AI decisions</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2" />
                                            <span>Regular audits ensure fairness compliance</span>
                                        </li>
                                    </ul>
                                </div>
                            </Card>

                            {/* Appeal Process */}
                            <Card className="bg-blue-50 border-blue-200">
                                <div className="p-6">
                                    <h3 className="font-semibold text-blue-900 mb-2">
                                        Appeal Process
                                    </h3>
                                    <p className="text-sm text-blue-800 mb-4">
                                        Candidates who believe they were unfairly evaluated
                                        can request a human review of their application.
                                    </p>
                                    <Button variant="secondary" size="sm" className="w-full">
                                        Request Review
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default FairnessPanel;
