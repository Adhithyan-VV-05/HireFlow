import { useState } from 'react';
import {
    Upload,
    FileText,
    Sparkles,
    CheckCircle,
    AlertCircle,
    Award,
    TrendingUp,
    Loader2,
    X,
    RefreshCw
} from 'lucide-react';
import { Layout } from '../components/layout';
import { Button, Card, CardHeader, CardTitle, ProgressBar } from '../components/ui';
import { SkillTag, ScoreCircle } from '../components/ui/ScoreDisplay';

/**
 * Resume Screening Module
 * Simulates AI resume parsing and job matching
 */
const ResumeScreening = () => {
    const [file, setFile] = useState(null);
    const [jobDescription, setJobDescription] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);

    // Simulated extracted skills from resume
    const mockExtractedSkills = [
        'React', 'JavaScript', 'TypeScript', 'Node.js', 'Python',
        'SQL', 'AWS', 'Docker', 'Git', 'REST APIs'
    ];

    // Simulated job required skills
    const mockRequiredSkills = [
        'React', 'TypeScript', 'Node.js', 'AWS', 'SQL', 'GraphQL', 'Docker'
    ];

    // Handle file upload (simulated)
    const handleFileUpload = (e) => {
        const uploadedFile = e.target.files[0];
        if (uploadedFile) {
            setFile(uploadedFile);
            setAnalysisResult(null);
        }
    };

    // Handle drag and drop
    const handleDrop = (e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            setFile(droppedFile);
            setAnalysisResult(null);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    // Analyze resume (simulated)
    const analyzeResume = () => {
        if (!file || !jobDescription.trim()) return;

        setIsAnalyzing(true);

        // Simulate AI processing delay
        setTimeout(() => {
            const matchedSkills = mockExtractedSkills.filter(skill =>
                mockRequiredSkills.some(req => req.toLowerCase() === skill.toLowerCase())
            );

            const matchScore = Math.round((matchedSkills.length / mockRequiredSkills.length) * 100);

            setAnalysisResult({
                extractedSkills: mockExtractedSkills,
                requiredSkills: mockRequiredSkills,
                matchedSkills,
                matchScore,
                ranking: matchScore >= 80 ? 1 : matchScore >= 60 ? 3 : 5,
                totalApplicants: 12,
                experience: {
                    years: 5,
                    relevance: 85
                },
                education: {
                    degree: "M.S. Computer Science",
                    match: 90
                },
                recommendation: matchScore >= 80 ? 'Strong Fit' : matchScore >= 60 ? 'Average Fit' : 'Weak Fit',
                keyFindings: [
                    "Strong technical skills matching 71% of required skills",
                    "5 years of relevant industry experience",
                    "Advanced degree in Computer Science",
                    "Missing GraphQL experience - can be trained"
                ]
            });
            setIsAnalyzing(false);
        }, 2000);
    };

    // Reset analysis
    const resetAnalysis = () => {
        setFile(null);
        setJobDescription('');
        setAnalysisResult(null);
    };

    return (
        <Layout>
            <div className="bg-slate-50 min-h-screen">
                {/* Page Header */}
                <div className="bg-white border-b border-slate-200">
                    <div className="container-custom py-8">
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
                            Resume Screening
                        </h1>
                        <p className="text-slate-600 mt-1">
                            AI-powered resume analysis and job matching
                        </p>
                    </div>
                </div>

                <div className="container-custom py-8">
                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Left Column - Upload & Input */}
                        <div className="space-y-6">
                            {/* File Upload */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Upload className="w-5 h-5 text-primary-600" />
                                        Upload Resume
                                    </CardTitle>
                                </CardHeader>
                                <div className="px-6 pb-6">
                                    <div
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        className={`
                      relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
                      ${file
                                                ? 'border-green-500 bg-green-50'
                                                : 'border-slate-300 hover:border-primary-400 hover:bg-primary-50'
                                            }
                    `}
                                    >
                                        {file ? (
                                            <div className="flex items-center justify-center gap-3">
                                                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                                    <FileText className="w-6 h-6 text-green-600" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-medium text-slate-800">{file.name}</p>
                                                    <p className="text-sm text-slate-500">
                                                        {(file.size / 1024).toFixed(1)} KB
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setFile(null)}
                                                    className="ml-auto p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                    <Upload className="w-8 h-8 text-primary-600" />
                                                </div>
                                                <p className="text-slate-800 font-medium mb-1">
                                                    Drop your resume here or click to upload
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    Supports PDF, DOC, DOCX (Max 5MB)
                                                </p>
                                                <input
                                                    type="file"
                                                    onChange={handleFileUpload}
                                                    accept=".pdf,.doc,.docx"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </Card>

                            {/* Job Description */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-primary-600" />
                                        Job Description
                                    </CardTitle>
                                </CardHeader>
                                <div className="px-6 pb-6">
                                    <textarea
                                        value={jobDescription}
                                        onChange={(e) => setJobDescription(e.target.value)}
                                        placeholder="Paste the job description here to match against the resume..."
                                        rows={6}
                                        className="input resize-none"
                                    />
                                    <p className="text-sm text-slate-500 mt-2">
                                        The AI will extract required skills and match them against the resume.
                                    </p>
                                </div>
                            </Card>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <Button
                                    onClick={analyzeResume}
                                    disabled={!file || !jobDescription.trim() || isAnalyzing}
                                    loading={isAnalyzing}
                                    icon={Sparkles}
                                    className="flex-1"
                                >
                                    {isAnalyzing ? 'Analyzing...' : 'Analyze Resume'}
                                </Button>
                                {analysisResult && (
                                    <Button variant="secondary" onClick={resetAnalysis} icon={RefreshCw}>
                                        Reset
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Right Column - Results */}
                        <div className="space-y-6">
                            {isAnalyzing ? (
                                <Card className="flex flex-col items-center justify-center py-16">
                                    <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                                        Analyzing Resume...
                                    </h3>
                                    <p className="text-slate-600 text-center max-w-sm">
                                        Our AI is extracting skills, matching requirements, and calculating fit scores.
                                    </p>
                                </Card>
                            ) : analysisResult ? (
                                <>
                                    {/* Match Score Card */}
                                    <Card>
                                        <div className="flex items-center justify-between p-6">
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-800 mb-1">
                                                    Overall Match Score
                                                </h3>
                                                <p className={`text-lg font-medium ${analysisResult.recommendation === 'Strong Fit'
                                                        ? 'text-green-600'
                                                        : analysisResult.recommendation === 'Average Fit'
                                                            ? 'text-amber-600'
                                                            : 'text-red-600'
                                                    }`}>
                                                    {analysisResult.recommendation}
                                                </p>
                                            </div>
                                            <ScoreCircle score={analysisResult.matchScore} size="lg" />
                                        </div>
                                        <div className="px-6 pb-6 border-t border-slate-100 pt-4">
                                            <div className="flex items-center gap-4 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Award className="w-4 h-4 text-primary-600" />
                                                    <span className="text-slate-600">Rank:</span>
                                                    <span className="font-semibold text-slate-800">
                                                        #{analysisResult.ranking} of {analysisResult.totalApplicants}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Skills Analysis */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Skills Analysis</CardTitle>
                                        </CardHeader>
                                        <div className="px-6 pb-6 space-y-4">
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-slate-700">Extracted Skills</span>
                                                    <span className="text-sm text-slate-500">
                                                        {analysisResult.extractedSkills.length} found
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {analysisResult.extractedSkills.map((skill, index) => (
                                                        <SkillTag
                                                            key={index}
                                                            skill={skill}
                                                            matched={analysisResult.matchedSkills.includes(skill)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="border-t border-slate-100 pt-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-slate-700">Required Skills Match</span>
                                                    <span className="text-sm font-semibold text-green-600">
                                                        {analysisResult.matchedSkills.length}/{analysisResult.requiredSkills.length}
                                                    </span>
                                                </div>
                                                <ProgressBar
                                                    value={analysisResult.matchedSkills.length}
                                                    max={analysisResult.requiredSkills.length}
                                                    color="success"
                                                    showLabel={false}
                                                />
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Additional Metrics */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Candidate Metrics</CardTitle>
                                        </CardHeader>
                                        <div className="px-6 pb-6 space-y-4">
                                            <ProgressBar
                                                value={analysisResult.experience.relevance}
                                                label="Experience Relevance"
                                                color="primary"
                                            />
                                            <ProgressBar
                                                value={analysisResult.education.match}
                                                label="Education Match"
                                                color="secondary"
                                            />
                                        </div>
                                    </Card>

                                    {/* Key Findings */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Key Findings</CardTitle>
                                        </CardHeader>
                                        <div className="px-6 pb-6">
                                            <ul className="space-y-3">
                                                {analysisResult.keyFindings.map((finding, index) => (
                                                    <li key={index} className="flex items-start gap-3">
                                                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                        <span className="text-slate-700">{finding}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </Card>
                                </>
                            ) : (
                                <Card className="flex flex-col items-center justify-center py-16">
                                    <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                                        <Sparkles className="w-10 h-10 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                                        Ready to Analyze
                                    </h3>
                                    <p className="text-slate-600 text-center max-w-sm">
                                        Upload a resume and paste a job description to see AI-powered
                                        skills extraction and matching analysis.
                                    </p>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ResumeScreening;
