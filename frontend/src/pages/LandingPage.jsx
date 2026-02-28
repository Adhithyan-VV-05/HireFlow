import { Link } from 'react-router-dom';
import {
    Brain,
    Clock,
    Users,
    ShieldAlert,
    FileSearch,
    Target,
    MessageSquare,
    ArrowRight,
    CheckCircle,
    Sparkles,
    TrendingUp,
    Zap
} from 'lucide-react';
import { Layout } from '../components/layout';
import { Button } from '../components/ui';

/**
 * Landing Page - Introduction to HireFlow AI
 * Features hero section, problem overview, and solution highlights
 */
const LandingPage = () => {
    // Problem items for the overview section
    const problems = [
        {
            icon: Clock,
            title: 'Time-Consuming Process',
            description: 'Manual resume screening takes hours per position, delaying the entire hiring pipeline.',
            color: 'text-amber-500',
            bg: 'bg-amber-100',
        },
        {
            icon: Users,
            title: 'High Application Volume',
            description: 'Companies receive hundreds of applications, making it impossible to review each thoroughly.',
            color: 'text-blue-500',
            bg: 'bg-blue-100',
        },
        {
            icon: ShieldAlert,
            title: 'Unconscious Bias',
            description: 'Human reviewers may introduce unintentional biases affecting diversity and fairness.',
            color: 'text-red-500',
            bg: 'bg-red-100',
        },
    ];

    // Solution features
    const solutions = [
        {
            icon: FileSearch,
            title: 'AI Resume Screening',
            description: 'Automatically parse and analyze resumes using NLP to extract skills, experience, and qualifications.',
            features: ['Skill extraction', 'Experience mapping', 'Education verification'],
        },
        {
            icon: Target,
            title: 'NLP-Based Job Matching',
            description: 'Match candidates to positions using semantic analysis for accurate skill-to-requirement alignment.',
            features: ['Semantic matching', 'Weighted scoring', 'Ranking system'],
        },
        {
            icon: MessageSquare,
            title: 'Automated Interviews',
            description: 'Conduct preliminary interviews with AI chatbot to assess communication and technical skills.',
            features: ['HR questions', 'Technical assessment', 'Real-time feedback'],
        },
    ];

    // Stats for social proof
    const stats = [
        { value: '90%', label: 'Time Saved' },
        { value: '85%', label: 'Accuracy Rate' },
        { value: '3x', label: 'Faster Hiring' },
        { value: '100%', label: 'Bias-Free' },
    ];

    return (
        <Layout>
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-hero text-white">
                {/* Background decoration */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-500/20 rounded-full blur-3xl" />
                </div>

                <div className="container-custom relative py-20 md:py-32">
                    <div className="max-w-4xl mx-auto text-center">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-8 animate-fade-in">
                            <Sparkles className="w-4 h-4" />
                            AI-Powered Recruitment Solution
                        </div>

                        {/* Main heading */}
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-slide-up">
                            HireFlow
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white to-primary-200">
                                AI
                            </span>
                        </h1>

                        {/* Tagline */}
                        <p className="text-xl md:text-2xl text-primary-100 mb-8 animate-slide-up animation-delay-200">
                            An End-to-End AI Hiring Solution
                        </p>

                        {/* Description */}
                        <p className="text-lg text-primary-200 max-w-2xl mx-auto mb-10 animate-slide-up animation-delay-400">
                            Transform your recruitment process with AI-powered resume screening,
                            intelligent candidate matching, and automated preliminary interviews.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up animation-delay-600">
                            <Button to="/dashboard" size="xl" className="w-full sm:w-auto bg-white  hover:bg-primary-50">
                                Recruiter Login
                                <ArrowRight className="w-5 h-5" />
                            </Button>
                            <Button to="/screening" variant="secondary" size="xl" className="w-full sm:w-auto border-white text-black hover:bg-white/10">
                                Candidate Portal
                            </Button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                        {stats.map((stat, index) => (
                            <div key={index} className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-xl">
                                <div className="text-3xl md:text-4xl font-bold mb-1">{stat.value}</div>
                                <div className="text-sm text-primary-200">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Wave decoration */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#f8fafc" />
                    </svg>
                </div>
            </section>

            {/* Problem Section */}
            <section className="section bg-slate-50">
                <div className="container-custom">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 mb-4">
                            <TrendingUp className="w-4 h-4" />
                            THE CHALLENGE
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                            Traditional Hiring is Broken
                        </h2>
                        <p className="text-lg text-slate-600">
                            Manual recruitment processes are inefficient, biased, and unable to
                            keep pace with modern hiring demands.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {problems.map((problem, index) => {
                            const Icon = problem.icon;
                            return (
                                <div
                                    key={index}
                                    className="card p-8 text-center hover:shadow-xl transition-shadow duration-300"
                                >
                                    <div className={`w-16 h-16 ${problem.bg} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                                        <Icon className={`w-8 h-8 ${problem.color}`} />
                                    </div>
                                    <h3 className="text-xl font-semibold text-slate-800 mb-3">
                                        {problem.title}
                                    </h3>
                                    <p className="text-slate-600">
                                        {problem.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Solution Section */}
            <section className="section bg-white">
                <div className="container-custom">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 mb-4">
                            <Zap className="w-4 h-4" />
                            THE SOLUTION
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                            AI-Powered Recruitment
                        </h2>
                        <p className="text-lg text-slate-600">
                            Leverage artificial intelligence and natural language processing to
                            revolutionize your hiring workflow.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {solutions.map((solution, index) => {
                            const Icon = solution.icon;
                            return (
                                <div
                                    key={index}
                                    className="card-hover p-8 group"
                                >
                                    <div className="w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-primary-500/25 group-hover:shadow-xl group-hover:shadow-primary-500/30 transition-shadow duration-300">
                                        <Icon className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-slate-800 mb-3">
                                        {solution.title}
                                    </h3>
                                    <p className="text-slate-600 mb-6">
                                        {solution.description}
                                    </p>
                                    <ul className="space-y-2">
                                        {solution.features.map((feature, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="section bg-gradient-hero text-white">
                <div className="container-custom text-center">
                    <div className="max-w-3xl mx-auto">
                        <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8">
                            <Brain className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            Ready to Transform Your Hiring?
                        </h2>
                        <p className="text-lg text-primary-200 mb-8">
                            Experience the power of AI-driven recruitment with HireFlow AI.
                            Reduce time-to-hire, eliminate bias, and find the perfect candidates.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Button to="/dashboard" size="lg" className="bg-white text-primary-600 hover:bg-primary-50">
                                Get Started Now
                                <ArrowRight className="w-5 h-5" />
                            </Button>
                            <Button to="/fairness" variant="ghost" size="lg" className="text-white hover:bg-white/10">
                                Learn About Fairness
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Academic Context */}
            <section className="py-12 bg-slate-100 border-t border-slate-200">
                <div className="container-custom">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-1">
                                Final Year Mini Project
                            </h3>
                            <p className="text-slate-600">
                                AI & Data Science - Demonstrating AI-Driven Recruiting Automation
                            </p>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-slate-500">
                            <span>Reduces Recruitment Time</span>
                            <span className="hidden md:inline">•</span>
                            <span>Minimizes Human Bias</span>
                            <span className="hidden md:inline">•</span>
                            <span>Data-Driven Decisions</span>
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
};

export default LandingPage;
