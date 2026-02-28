import { Brain, Github, Linkedin, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Footer component with project info and links
 */
const Footer = () => {
    return (
        <footer className="bg-slate-900 text-slate-300">
            <div className="container-custom py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="md:col-span-2">
                        <Link to="/" className="flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                                <Brain className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">HireFlow AI</span>
                        </Link>
                        <p className="text-slate-400 mb-4 max-w-md">
                            An End-to-End AI Hiring Solution that automates recruitment with
                            AI-powered screening, NLP-based matching, and ethical hiring practices.
                        </p>
                        <p className="text-sm text-slate-500">
                            Final Year Mini Project - AI & Data Science
                            z           </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Quick Links</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/dashboard" className="hover:text-primary-400 transition-colors">
                                    Dashboard
                                </Link>
                            </li>
                            <li>
                                <Link to="/screening" className="hover:text-primary-400 transition-colors">
                                    Resume Screening
                                </Link>
                            </li>
                            <li>
                                <Link to="/interview" className="hover:text-primary-400 transition-colors">
                                    AI Interview
                                </Link>
                            </li>
                            <li>
                                <Link to="/fairness" className="hover:text-primary-400 transition-colors">
                                    Fairness Panel
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Project Info */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Project Info</h3>
                        <ul className="space-y-2 text-slate-400">
                            <li>AI-Driven Recruiting</li>
                            <li>NLP-Based Matching</li>
                            <li>Explainable AI</li>
                            <li>Bias-Free Hiring</li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-slate-800 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-slate-500">
                        © 2024 HireFlow AI. Academic Project Demo.
                    </p>
                    <div className="flex items-center gap-4">
                        <a href="#" className="text-slate-400 hover:text-primary-400 transition-colors">
                            <Github className="w-5 h-5" />
                        </a>
                        <a href="#" className="text-slate-400 hover:text-primary-400 transition-colors">
                            <Linkedin className="w-5 h-5" />
                        </a>
                        <a href="#" className="text-slate-400 hover:text-primary-400 transition-colors">
                            <Mail className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
