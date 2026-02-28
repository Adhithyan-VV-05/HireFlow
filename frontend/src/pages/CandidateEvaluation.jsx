import { useParams, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    GraduationCap,
    Calendar,
    CheckCircle,
    AlertCircle,
    TrendingUp,
    Award,
    Target,
    Star
} from 'lucide-react';
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip
} from 'recharts';
import { Layout } from '../components/layout';
import { Button, Card, CardHeader, CardTitle, ProgressBar } from '../components/ui';
import { StatusBadge } from '../components/ui/Badge';
import { ScoreCircle, SkillTag, StarRating } from '../components/ui/ScoreDisplay';
import { candidates } from '../data/candidates';

/**
 * Candidate Evaluation Page
 * Detailed candidate analysis with visualizations
 */
const CandidateEvaluation = () => {
    const { id } = useParams();
    const candidate = candidates.find(c => c.id === parseInt(id)) || candidates[0];

    // Prepare data for radar chart
    const radarData = [
        { skill: 'Technical', value: candidate.skillsMatch },
        { skill: 'Experience', value: candidate.experienceMatch },
        { skill: 'Education', value: candidate.educationMatch },
        { skill: 'AI Score', value: candidate.aiScore },
        { skill: 'Culture Fit', value: Math.round((candidate.aiScore + candidate.skillsMatch) / 2) },
    ];

    // Prepare data for skills bar chart
    const skillsData = candidate.skills.slice(0, 6).map((skill, index) => ({
        name: skill,
        match: Math.round(70 + Math.random() * 30), // Simulated match scores
    }));

    // Recommendation config
    const recommendationConfig = {
        'Strong Fit': {
            color: 'text-green-600',
            bg: 'bg-green-100',
            icon: CheckCircle,
            iconColor: 'text-green-600',
        },
        'Average Fit': {
            color: 'text-amber-600',
            bg: 'bg-amber-100',
            icon: AlertCircle,
            iconColor: 'text-amber-600',
        },
        'Weak Fit': {
            color: 'text-red-600',
            bg: 'bg-red-100',
            icon: AlertCircle,
            iconColor: 'text-red-600',
        },
    };

    const recConfig = recommendationConfig[candidate.aiRecommendation] || recommendationConfig['Average Fit'];
    const RecIcon = recConfig.icon;

    return (
        <Layout>
            <div className="bg-slate-50 min-h-screen">
                {/* Page Header */}
                <div className="bg-white border-b border-slate-200">
                    <div className="container-custom py-6">
                        <Link
                            to="/dashboard"
                            className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Dashboard
                        </Link>

                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                            {/* Avatar */}
                            <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary-500/25">
                                {candidate.name.split(' ').map(n => n[0]).join('')}
                            </div>

                            {/* Basic Info */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
                                        {candidate.name}
                                    </h1>
                                    <StatusBadge status={candidate.status} />
                                </div>
                                <p className="text-lg text-slate-600 mb-3">
                                    {candidate.currentRole}
                                </p>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <Mail className="w-4 h-4" />
                                        {candidate.email}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Phone className="w-4 h-4" />
                                        {candidate.phone}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        {candidate.location}
                                    </span>
                                </div>
                            </div>

                            {/* Quick Score */}
                            <div className="flex items-center gap-6">
                                <ScoreCircle score={candidate.aiScore} size="md" label="AI Score" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container-custom py-8">
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Left Column */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* AI Recommendation */}
                            <Card>
                                <div className={`p-6 ${recConfig.bg} rounded-t-xl`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 bg-white rounded-xl flex items-center justify-center ${recConfig.iconColor}`}>
                                            <RecIcon className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold ${recConfig.color}`}>
                                                {candidate.aiRecommendation}
                                            </h3>
                                            <p className="text-slate-600">AI Recommendation</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <h4 className="font-semibold text-slate-800 mb-3">Justification</h4>
                                    <p className="text-slate-600 leading-relaxed">
                                        {candidate.aiJustification}
                                    </p>
                                </div>
                            </Card>

                            {/* Skills Match Visualization */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Target className="w-5 h-5 text-primary-600" />
                                        Skills Analysis
                                    </CardTitle>
                                </CardHeader>
                                <div className="px-6 pb-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {/* Radar Chart */}
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RadarChart data={radarData}>
                                                    <PolarGrid stroke="#e2e8f0" />
                                                    <PolarAngleAxis
                                                        dataKey="skill"
                                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                                    />
                                                    <PolarRadiusAxis
                                                        angle={30}
                                                        domain={[0, 100]}
                                                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                                                    />
                                                    <Radar
                                                        name="Score"
                                                        dataKey="value"
                                                        stroke="#6366f1"
                                                        fill="#6366f1"
                                                        fillOpacity={0.3}
                                                        strokeWidth={2}
                                                    />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Skills Bar Chart */}
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={skillsData} layout="vertical">
                                                    <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                                                    <YAxis
                                                        dataKey="name"
                                                        type="category"
                                                        width={80}
                                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                                    />
                                                    <Tooltip
                                                        formatter={(value) => [`${value}%`, 'Match']}
                                                        contentStyle={{
                                                            backgroundColor: 'white',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '8px'
                                                        }}
                                                    />
                                                    <Bar
                                                        dataKey="match"
                                                        fill="#6366f1"
                                                        radius={[0, 4, 4, 0]}
                                                    />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Skills Tags */}
                                    <div className="mt-6 pt-6 border-t border-slate-100">
                                        <h4 className="text-sm font-medium text-slate-700 mb-3">All Skills</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {candidate.skills.map((skill, index) => (
                                                <SkillTag key={index} skill={skill} matched={index < 5} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Experience Overview */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Briefcase className="w-5 h-5 text-primary-600" />
                                        Experience Overview
                                    </CardTitle>
                                </CardHeader>
                                <div className="px-6 pb-6">
                                    <div className="flex items-center gap-6 mb-6">
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-primary-600">
                                                {candidate.experience}
                                            </div>
                                            <div className="text-sm text-slate-500">Years</div>
                                        </div>
                                        <div className="flex-1">
                                            <ProgressBar
                                                value={candidate.experienceMatch}
                                                label="Experience Match"
                                                color="primary"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-3 h-3 bg-primary-600 rounded-full mt-1.5" />
                                            <div>
                                                <h5 className="font-medium text-slate-800">{candidate.currentRole}</h5>
                                                <p className="text-sm text-slate-600">{candidate.location}</p>
                                                <p className="text-sm text-slate-500 mt-1">
                                                    {candidate.experience} years of experience in software development
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            {/* Quick Metrics */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Quick Metrics</CardTitle>
                                </CardHeader>
                                <div className="px-6 pb-6 space-y-4">
                                    <ProgressBar
                                        value={candidate.skillsMatch}
                                        label="Skills Match"
                                        color="auto"
                                    />
                                    <ProgressBar
                                        value={candidate.experienceMatch}
                                        label="Experience Match"
                                        color="auto"
                                    />
                                    <ProgressBar
                                        value={candidate.educationMatch}
                                        label="Education Match"
                                        color="auto"
                                    />
                                </div>
                            </Card>

                            {/* Education */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <GraduationCap className="w-5 h-5 text-primary-600" />
                                        Education
                                    </CardTitle>
                                </CardHeader>
                                <div className="px-6 pb-6">
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <p className="font-medium text-slate-800 mb-1">
                                            {candidate.education}
                                        </p>
                                        <div className="flex items-center gap-2 mt-3">
                                            <span className="text-sm text-slate-500">Match:</span>
                                            <span className="text-sm font-semibold text-green-600">
                                                {candidate.educationMatch}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Key Strengths */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Award className="w-5 h-5 text-primary-600" />
                                        Key Strengths
                                    </CardTitle>
                                </CardHeader>
                                <div className="px-6 pb-6">
                                    <ul className="space-y-2">
                                        {candidate.keyStrengths.map((strength, index) => (
                                            <li key={index} className="flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                                <span className="text-slate-700">{strength}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </Card>

                            {/* Areas of Improvement */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-amber-600" />
                                        Areas to Improve
                                    </CardTitle>
                                </CardHeader>
                                <div className="px-6 pb-6">
                                    <ul className="space-y-2">
                                        {candidate.areasOfImprovement.map((area, index) => (
                                            <li key={index} className="flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 text-amber-500" />
                                                <span className="text-slate-700">{area}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </Card>

                            {/* Interview Score */}
                            {candidate.interviewScore && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Interview Score</CardTitle>
                                    </CardHeader>
                                    <div className="px-6 pb-6 text-center">
                                        <ScoreCircle score={candidate.interviewScore} size="md" />
                                        <div className="mt-4">
                                            <StarRating rating={Math.round(candidate.interviewScore / 20)} />
                                        </div>
                                    </div>
                                </Card>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3">
                                <Button to="/interview" className="flex-1">
                                    Schedule Interview
                                </Button>
                                <Button to="/dashboard" variant="secondary">
                                    Back
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default CandidateEvaluation;
