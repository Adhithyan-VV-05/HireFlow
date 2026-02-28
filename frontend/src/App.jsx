import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import InterviewerPortal from './pages/RecruiterPortal';
import CandidatePortal from './pages/CandidatePortal';
import AssistantWidget from './components/AssistantWidget';

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import VideoInterview from './pages/VideoInterview';

function AppContent() {
    const { user, loading } = useAuth();
    const [showSignup, setShowSignup] = useState(false);

    // Loading state
    if (loading) {
        return (
            <div className="auth-page">
                <div className="loading-state" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                        <span className="spinner" style={{ width: 48, height: 48, borderWidth: 3 }} />
                        <p style={{ marginTop: '1rem', color: 'var(--gray-400)' }}>Loading HireFlow AI...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Not logged in → show login/signup
    if (!user) {
        if (showSignup) {
            return <SignupPage onSwitchToLogin={() => setShowSignup(false)} />;
        }
        return <LoginPage onSwitchToSignup={() => setShowSignup(true)} />;
    }

    // Logged in → route to correct portal or video interview
    return (
        <>
            <Routes>
                <Route path="/" element={user.role === 'interviewer' ? <InterviewerPortal /> : <CandidatePortal />} />
                <Route path="/video-interview/:id" element={<VideoInterview />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            <AssistantWidget />
        </>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <Router>
                <AppContent />
            </Router>
        </AuthProvider>
    );
}
