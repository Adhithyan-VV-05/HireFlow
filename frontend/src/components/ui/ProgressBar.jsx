/**
 * ProgressBar - Animated progress indicator
 */
const ProgressBar = ({
    value = 0,
    max = 100,
    color = 'primary',
    size = 'md',
    showLabel = true,
    label,
    className = ''
}) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const colorClasses = {
        primary: 'bg-primary-500',
        secondary: 'bg-secondary-500',
        success: 'bg-green-500',
        warning: 'bg-amber-500',
        danger: 'bg-red-500',
        info: 'bg-blue-500',
    };

    const bgClasses = {
        primary: 'bg-primary-100',
        secondary: 'bg-secondary-100',
        success: 'bg-green-100',
        warning: 'bg-amber-100',
        danger: 'bg-red-100',
        info: 'bg-blue-100',
    };

    const sizeClasses = {
        sm: 'h-1.5',
        md: 'h-2.5',
        lg: 'h-4',
    };

    // Determine color based on value for score indicators
    const getScoreColor = () => {
        if (percentage >= 80) return 'success';
        if (percentage >= 60) return 'primary';
        if (percentage >= 40) return 'warning';
        return 'danger';
    };

    const resolvedColor = color === 'auto' ? getScoreColor() : color;

    return (
        <div className={className}>
            {showLabel && (
                <div className="flex justify-between items-center mb-1.5">
                    {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
                    <span className="text-sm font-semibold text-slate-800">{Math.round(percentage)}%</span>
                </div>
            )}
            <div className={`w-full rounded-full ${bgClasses[resolvedColor]} ${sizeClasses[size]} overflow-hidden`}>
                <div
                    className={`${sizeClasses[size]} rounded-full ${colorClasses[resolvedColor]} transition-all duration-500 ease-out`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

export default ProgressBar;
