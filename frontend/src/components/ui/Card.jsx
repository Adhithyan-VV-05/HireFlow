/**
 * Card component with variants
 */
const Card = ({
    children,
    className = '',
    hover = false,
    padding = 'default',
    onClick
}) => {
    const paddingClasses = {
        none: '',
        sm: 'p-4',
        default: 'p-6',
        lg: 'p-8',
    };

    return (
        <div
            className={`
        bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100
        ${hover ? 'hover:shadow-xl hover:shadow-primary-100/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer' : ''}
        ${paddingClasses[padding]}
        ${className}
      `}
            onClick={onClick}
        >
            {children}
        </div>
    );
};

// Card Header subcomponent
export const CardHeader = ({ children, className = '' }) => (
    <div className={`border-b border-slate-100 pb-4 mb-4 ${className}`}>
        {children}
    </div>
);

// Card Title subcomponent
export const CardTitle = ({ children, className = '' }) => (
    <h3 className={`text-lg font-semibold text-slate-800 ${className}`}>
        {children}
    </h3>
);

// Card Content subcomponent
export const CardContent = ({ children, className = '' }) => (
    <div className={className}>
        {children}
    </div>
);

export default Card;
