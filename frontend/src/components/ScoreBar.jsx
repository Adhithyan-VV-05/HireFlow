import React from 'react';

export default function ScoreBar({
    score = 0,
    maxScore = 1,
    label = '',
    height = 6,
    showLabel = false,
    color = null
}) {
    const numScore = typeof score === 'number' ? score : parseFloat(score) || 0;
    const percent = Math.min(Math.max((numScore / maxScore) * 100, 0), 100);

    let fillColor = color;
    if (!fillColor) {
        if (percent >= 85) fillColor = '#7c3aed'; // Violet Elite
        else if (percent >= 75) fillColor = '#10b981'; // Emerald High
        else if (percent >= 60) fillColor = '#3b82f6'; // Blue Competitive
        else if (percent >= 45) fillColor = '#f59e0b'; // Amber Foundational
        else fillColor = '#ef4444'; // Red
    }

    return (
        <div style={{ width: '100%' }}>
            {showLabel && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    marginBottom: '0.25rem',
                    color: '#64748b'
                }}>
                    <span style={{ fontWeight: 500 }}>{label}</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                        {maxScore === 1 ? `${Math.round(numScore * 100)}%` : `${numScore.toFixed(1)}%`}
                    </span>
                </div>
            )}
            <div style={{
                width: '100%',
                height: `${height}px`,
                backgroundColor: '#f1f5f9',
                borderRadius: '9999px',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <div
                    style={{
                        width: `${percent}%`,
                        height: '100%',
                        backgroundColor: fillColor,
                        borderRadius: '9999px',
                        transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                />
            </div>
        </div>
    );
}

