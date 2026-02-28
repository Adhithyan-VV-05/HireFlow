import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Users,
    CheckCircle,
    XCircle,
    MessageSquare,
    Briefcase,
    MapPin,
    Calendar,
    Eye,
    Filter,
    Search,
    TrendingUp,
    ArrowUpRight
} from 'lucide-react';
import { Layout } from '../components/layout';
import { StatCard, Button, ProgressBar, Card, CardHeader, CardTitle } from '../components/ui';
import { StatusBadge } from '../components/ui/Badge';
import { candidates, candidateStats } from '../data/candidates';
import { jobs, jobStats } from '../data/jobs';

/**
 * Recruiter Dashboard - Central control panel
 * Shows summary stats, job postings, and candidate rankings
 */
const RecruiterDashboard = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('aiScore');

    // Filter and sort candidates
    const filteredCandidates = candidates
        .filter(candidate => {
            const matchesSearch = candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                candidate.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            if (sortBy === 'aiScore') return b.aiScore - a.aiScore;
            if (sortBy === 'skillsMatch') return b.skillsMatch - a.skillsMatch;
            if (sortBy === 'experience') return b.experience - a.experience;
            return 0;
        });

    return (
        <Layout>
            <div className="bg-slate-50 min-h-screen">
                {/* Page Header */}
                <div className="bg-white border-b border-slate-200">
                    <div className="container-custom py-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
                                    Recruiter Dashboard
                                </h1>
                                <p className="text-slate-600 mt-1">
                                    Manage applications and track hiring progress
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button to="/screening" icon={TrendingUp}>
                                    Screen Resumes
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container-custom py-8">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard
                            title="Total Applicants"
                            value={candidateStats.total}
                            icon={Users}
                            color="primary"
                            trend="up"
                            trendValue="+12 this week"
                        />
                        <StatCard
                            title="Shortlisted"
                            value={candidateStats.shortlisted}
                            icon={CheckCircle}
                            color="success"
                        />
                        <StatCard
                            title="Rejected"
                            value={candidateStats.rejected}
                            icon={XCircle}
                            color="danger"
                        />
                        <StatCard
                            title="In Interview"
                            value={candidateStats.interview}
                            icon={MessageSquare}
                            color="info"
                        />
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Job Postings - Left Column */}
                        <div className="lg:col-span-1">
                            <Card padding="none">
                                <CardHeader className="p-6 pb-0">
                                    <div className="flex items-center justify-between">
                                        <CardTitle>Active Jobs</CardTitle>
                                        <span className="text-sm text-primary-600 font-medium">
                                            {jobStats.activeJobs} Open
                                        </span>
                                    </div>
                                </CardHeader>
                                <div className="p-4 space-y-3">
                                    {jobs.slice(0, 4).map((job) => (
                                        <div
                                            key={job.id}
                                            className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="font-semibold text-slate-800 group-hover:text-primary-600 transition-colors">
                                                    {job.title}
                                                </h4>
                                                <StatusBadge status={job.status} />
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                                                <span className="flex items-center gap-1">
                                                    <Briefcase className="w-3.5 h-3.5" />
                                                    {job.department}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    {job.location.split(',')[0]}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-600">
                                                    <strong>{job.applicantCount}</strong> applicants
                                                </span>
                                                <span className="text-sm text-green-600">
                                                    {job.shortlistedCount} shortlisted
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>

                        {/* Candidate Table - Right Column */}
                        <div className="lg:col-span-2">
                            <Card padding="none">
                                <CardHeader className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        <CardTitle className="flex-shrink-0">Candidate Rankings</CardTitle>

                                        {/* Search and Filters */}
                                        <div className="flex flex-1 items-center gap-3">
                                            <div className="relative flex-1 max-w-xs">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search candidates..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="input pl-10"
                                                />
                                            </div>

                                            <select
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                                className="input w-auto"
                                            >
                                                <option value="all">All Status</option>
                                                <option value="shortlisted">Shortlisted</option>
                                                <option value="interview">Interview</option>
                                                <option value="rejected">Rejected</option>
                                            </select>

                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value)}
                                                className="input w-auto"
                                            >
                                                <option value="aiScore">AI Score</option>
                                                <option value="skillsMatch">Skills Match</option>
                                                <option value="experience">Experience</option>
                                            </select>
                                        </div>
                                    </div>
                                </CardHeader>

                                {/* Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-y border-slate-100">
                                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                    Candidate
                                                </th>
                                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                    Skills Match
                                                </th>
                                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                    Experience
                                                </th>
                                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                    AI Score
                                                </th>
                                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredCandidates.map((candidate, index) => (
                                                <tr key={candidate.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                                                                {candidate.name.split(' ').map(n => n[0]).join('')}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-slate-800">
                                                                    {candidate.name}
                                                                </div>
                                                                <div className="text-sm text-slate-500">
                                                                    {candidate.currentRole}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <ProgressBar
                                                            value={candidate.skillsMatch}
                                                            color="auto"
                                                            size="sm"
                                                            showLabel={false}
                                                        />
                                                        <span className="text-sm font-medium text-slate-600">
                                                            {candidate.skillsMatch}%
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-slate-800 font-medium">
                                                            {candidate.experience} years
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className={`inline-flex items-center px-2.5 py-1 rounded-lg font-semibold text-sm ${candidate.aiScore >= 80
                                                                ? 'bg-green-100 text-green-700'
                                                                : candidate.aiScore >= 60
                                                                    ? 'bg-primary-100 text-primary-700'
                                                                    : 'bg-amber-100 text-amber-700'
                                                            }`}>
                                                            {candidate.aiScore}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <StatusBadge status={candidate.status} />
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Link
                                                            to={`/candidate/${candidate.id}`}
                                                            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium text-sm"
                                                        >
                                                            View
                                                            <ArrowUpRight className="w-4 h-4" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Table Footer */}
                                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-sm text-slate-500">
                                        Showing {filteredCandidates.length} of {candidates.length} candidates
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="sm" disabled>
                                            Previous
                                        </Button>
                                        <Button variant="ghost" size="sm">
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default RecruiterDashboard;
