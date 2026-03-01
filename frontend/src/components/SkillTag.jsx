import React from 'react';

const variants = {
    default: 'skill-tag-default',
    matched: 'skill-tag-matched',
    warm: 'skill-tag-warm',
};

export default function SkillTag({ skill, variant = 'default', onClick, className = '' }) {
    return (
        <span
            className={`skill-tag ${variants[variant] || variants.default} ${className}`}
            onClick={onClick}
            style={onClick ? { cursor: 'pointer' } : {}}
        >
            {skill}
        </span>
    );
}
