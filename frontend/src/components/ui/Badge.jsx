/**
 * Badge component for status indicators
 */
const Badge = ({ children, variant = 'primary', size = 'md', className = '' }) => {
    const variants = {
        primary: 'bg-primary-100 text-primary-800',
        secondary: 'bg-secondary-100 text-secondary-800',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-amber-100 text-amber-800',
        danger: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800',
        neutral: 'bg-slate-100 text-slate-800',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
    };

    return (
        <span className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`}>
            {children}
        </span>
    );
};

// Predefined status badges
export const StatusBadge = ({ status }) => {
    const statusConfig = {
        shortlisted: { label: 'Shortlisted', variant: 'success' },
        rejected: { label: 'Rejected', variant: 'danger' },
        interview: { label: 'Interview', variant: 'info' },
        pending: { label: 'Pending', variant: 'warning' },
        active: { label: 'Active', variant: 'success' },
        closed: { label: 'Closed', variant: 'neutral' },
    };

    const config = statusConfig[status] || { label: status, variant: 'neutral' };

    return <Badge variant={config.variant}>{config.label}</Badge>;
};

export default Badge;
