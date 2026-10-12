import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Star, X, CheckCircle, Target, MessageSquare, RefreshCw } from 'lucide-react';

export default function UserFeedbackModal({ isOpen, onClose, onFeedbackSubmitted = () => {} }) {
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [feedbackText, setFeedbackText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Summary stats
    const [summary, setSummary] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSummary();
            setSubmitted(false);
            setRating(5);
            setFeedbackText('');
        }
    }, [isOpen]);

    const fetchSummary = async () => {
        setLoadingSummary(true);
        try {
            const data = await api.getFeedbackSummary();
            setSummary(data);
        } catch (err) {
            console.error('[Feedback] Error fetching summary:', err);
        } finally {
            setLoadingSummary(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.submitFeedback({
                rating,
                feedback_text: feedbackText,
                feature: 'recruitment_dashboard'
            });
            setSubmitted(true);
            fetchSummary();
            onFeedbackSubmitted();
        } catch (err) {
            alert(err.message || 'Failed to submit feedback.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                width: '100%',
                maxWidth: '540px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid #e2e8f0'
                }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                        User Experience & Satisfaction
                    </h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div style={{ padding: '1.5rem' }}>
                    {/* Real-time Satisfaction Metric Banner */}
                    <div style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '1rem 1.25rem',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                                Evaluation Target vs. Actual Satisfaction
                            </span>
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                backgroundColor: summary?.target_met ? '#ecfdf5' : '#fef3c7',
                                color: summary?.target_met ? '#059669' : '#b45309'
                            }}>
                                Target: {summary?.target_benchmark_pct || 85}%
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.4rem' }}>
                            <span style={{
                                fontSize: '2rem',
                                fontWeight: 800,
                                color: (summary?.satisfaction_score_pct || 0) >= 85 ? '#059669' : '#d97706'
                            }}>
                                {summary?.satisfaction_score_pct || 0}%
                            </span>
                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                rated 4 or 5 stars ({summary?.total_feedbacks || 0} reviews)
                            </span>
                        </div>

                        <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                width: `${summary?.satisfaction_score_pct || 0}%`,
                                backgroundColor: (summary?.satisfaction_score_pct || 0) >= 85 ? '#10b981' : '#f59e0b',
                                transition: 'width 0.4s ease'
                            }} />
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.4rem' }}>
                            Target is a strict benchmark requirement (85%). Actual score is calculated transparently from submitted recruiter responses.
                        </div>
                    </div>

                    {submitted ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                                Thank you for your feedback!
                            </h4>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
                                Your rating of {rating} stars has been recorded and factored into our live satisfaction index.
                            </p>
                            <button className="m4-btn m4-btn-primary" onClick={onClose}>
                                Done
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                                    How would you rate the recruitment and voice screening experience?
                                </label>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            type="button"
                                            key={star}
                                            className={`m4-star-btn ${(hoverRating || rating) >= star ? 'active' : ''}`}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            onClick={() => setRating(star)}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                                    {rating === 5 && 'Outstanding (5/5)'}
                                    {rating === 4 && 'Very Good (4/5)'}
                                    {rating === 3 && 'Satisfactory (3/5)'}
                                    {rating === 2 && 'Needs Improvement (2/5)'}
                                    {rating === 1 && 'Unsatisfactory (1/5)'}
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                                    Optional Comments or Suggestions:
                                </label>
                                <textarea
                                    className="m4-input"
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                    rows={3}
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    placeholder="Tell us what you liked or how we can improve the platform..."
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                <button type="button" className="m4-btn m4-btn-secondary" onClick={onClose}>
                                    Cancel
                                </button>
                                <button type="submit" className="m4-btn m4-btn-primary" disabled={submitting}>
                                    {submitting ? 'Submitting...' : 'Submit Rating'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
