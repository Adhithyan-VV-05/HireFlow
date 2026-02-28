import React from 'react';

export default function ScoreBar({ score, maxScore = 1, label = 'Score' }) {
    const percent = Math.min((score / maxScore) * 100, 100);
    const level = percent >= 70 ? 'high' : percent >= 40 ? 'medium' : 'low';

    return (
        <div className="score-bar-container">
            <div className="score-bar-label">
                <span style={{ color: 'var(--gray-400)' }}>{label}</span>
                <span style={{ color: 'white', fontWeight: 600 }}>
                    {typeof score === 'number' ? score.toFixed(4) : score}
                </span>
            </div>
            <div className="score-bar-track">
                <div
                    className={`score-bar-fill ${level}`}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}
