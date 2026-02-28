/**
 * StatCard - Dashboard summary card with icon and value
 */
const StatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendValue,
    color = 'primary',
    className = ''
}) => {
    const colorClasses = {
        primary: 'bg-primary-100 text-primary-600',
        success: 'bg-green-100 text-green-600',
        warning: 'bg-amber-100 text-amber-600',
        danger: 'bg-red-100 text-red-600',
        info: 'bg-blue-100 text-blue-600',
    };

    const trendColors = {
        up: 'text-green-600',
        down: 'text-red-600',
        neutral: 'text-slate-500',
    };

    return (
        <div className={`card p-6 ${className}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                    <p className="text-3xl font-bold text-slate-800">{value}</p>
                    {trend && (
                        <p className={`text-sm mt-2 ${trendColors[trend]}`}>
                            {trend === 'up' && '↑'}
                            {trend === 'down' && '↓'}
                            {trendValue}
                        </p>
                    )}
                </div>
                {Icon && (
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
                        <Icon className="w-6 h-6" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatCard;
