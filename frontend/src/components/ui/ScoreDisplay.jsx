import { Star } from 'lucide-react';

/**
 * ScoreCircle - Circular score indicator
 */
export const ScoreCircle = ({ score, size = 'md', label, showPercent = true }) => {
    const sizes = {
        sm: { container: 'w-16 h-16', text: 'text-lg', stroke: 4 },
        md: { container: 'w-24 h-24', text: 'text-2xl', stroke: 6 },
        lg: { container: 'w-32 h-32', text: 'text-3xl', stroke: 8 },
    };

    const getColor = () => {
        if (score >= 80) return { stroke: '#22c55e', bg: '#dcfce7' };
        if (score >= 60) return { stroke: '#6366f1', bg: '#e0e7ff' };
        if (score >= 40) return { stroke: '#f59e0b', bg: '#fef3c7' };
        return { stroke: '#ef4444', bg: '#fee2e2' };
    };

    const color = getColor();
    const circumference = 2 * Math.PI * 40;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className={`relative ${sizes[size].container}`}>
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={color.bg}
                        strokeWidth={sizes[size].stroke}
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={color.stroke}
                        strokeWidth={sizes[size].stroke}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-700 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`font-bold ${sizes[size].text}`} style={{ color: color.stroke }}>
                        {score}{showPercent && '%'}
                    </span>
                </div>
            </div>
            {label && <span className="mt-2 text-sm font-medium text-slate-600">{label}</span>}
        </div>
    );
};

/**
 * StarRating - Star-based rating display
 */
export const StarRating = ({ rating, maxRating = 5, size = 'md' }) => {
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    };

    return (
        <div className="flex items-center gap-1">
            {[...Array(maxRating)].map((_, index) => (
                <Star
                    key={index}
                    className={`${sizes[size]} ${index < rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-slate-200 text-slate-200'
                        }`}
                />
            ))}
        </div>
    );
};

/**
 * SkillTag - Individual skill display
 */
export const SkillTag = ({ skill, matched = false, className = '' }) => (
    <span
        className={`
      inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
      ${matched
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }
      ${className}
    `}
    >
        {matched && <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2" />}
        {skill}
    </span>
);

export default { ScoreCircle, StarRating, SkillTag };
