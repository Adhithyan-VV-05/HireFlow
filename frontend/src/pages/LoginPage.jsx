import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage({ onSwitchToSignup }) {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    console.log('[LoginPage] Backend APIs: POST /api/auth/login');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
        } catch (err) {
            setError(err.message || 'Login failed');
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
                    <h1 className="auth-title">Welcome Back</h1>
                    <p className="auth-subtitle">Sign in to your account to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && (
                        <div className="auth-error">
                            <div>{error}</div>
                            <div style={{ fontSize: '0.78rem', marginTop: '0.25rem', opacity: 0.85 }}>
                                Tip: Use one of the 1-Click Demo accounts below or create a new account.
                            </div>
                        </div>
                    )}

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

                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? (
                            <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing in...</>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                {/* 1-Click Demo Logins */}
                <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '0.65rem', fontWeight: 600 }}>
                        ⚡ 1-Click Demo Accounts
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setEmail('alice@techflow.ai');
                                setPassword('password123');
                                setError('');
                                login('alice@techflow.ai', 'password123').catch(err => setError(err.message));
                            }}
                            style={{
                                padding: '0.6rem 0.5rem',
                                background: 'rgba(99, 102, 241, 0.12)',
                                border: '1px solid rgba(99, 102, 241, 0.35)',
                                borderRadius: '8px',
                                color: '#e0e7ff',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                textAlign: 'center',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{ fontWeight: 600 }}>💼 Recruiter</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>alice@techflow.ai</div>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setEmail('aarav@example.com');
                                setPassword('password123');
                                setError('');
                                login('aarav@example.com', 'password123').catch(err => setError(err.message));
                            }}
                            style={{
                                padding: '0.6rem 0.5rem',
                                background: 'rgba(16, 185, 129, 0.12)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                borderRadius: '8px',
                                color: '#d1fae5',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                textAlign: 'center',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{ fontWeight: 600 }}>👤 Candidate</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>aarav@example.com</div>
                        </button>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', textAlign: 'center', marginTop: '0.5rem' }}>
                        Password for all demo accounts: <code style={{ color: '#cbd5e1' }}>password123</code>
                    </div>
                </div>

                <div className="auth-footer">
                    <p>Don't have an account?{' '}
                        <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToSignup(); }} className="auth-link">
                            Create one
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
