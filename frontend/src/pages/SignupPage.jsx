import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function SignupPage({ onSwitchToLogin }) {
    const { signup } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('candidate');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    console.log('[SignupPage] Backend APIs: POST /api/auth/signup');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await signup(name, email, password, role);
        } catch (err) {
            setError(err.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <div className="auth-logo">
                        <span className="logo-icon">⚡</span>
                        <span className="logo-text">HireFlow AI</span>
                    </div>
                    <h1 className="auth-title">Create Account</h1>
                    <p className="auth-subtitle">Join HireFlow AI to get started</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && <div className="auth-error">{error}</div>}

                    {/* Role Selector */}
                    <div className="role-selector">
                        <button
                            type="button"
                            className={`role-btn ${role === 'candidate' ? 'active' : ''}`}
                            onClick={() => setRole('candidate')}
                        >
                            <span className="role-icon">👤</span>
                            <span className="role-label">Candidate</span>
                            <span className="role-desc">Upload resume & take interviews</span>
                        </button>
                        <button
                            type="button"
                            className={`role-btn ${role === 'interviewer' ? 'active' : ''}`}
                            onClick={() => setRole('interviewer')}
                        >
                            <span className="role-icon">💼</span>
                            <span className="role-label">Interviewer</span>
                            <span className="role-desc">Post jobs & evaluate candidates</span>
                        </button>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Confirm Password</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? (
                            <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Creating account...</>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Already have an account?{' '}
                        <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToLogin(); }} className="auth-link">
                            Sign in
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
