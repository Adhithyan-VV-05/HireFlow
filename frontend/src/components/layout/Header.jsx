import { Link, useLocation } from 'react-router-dom';
import {
    Brain,
    LayoutDashboard,
    FileSearch,
    Users,
    MessageSquare,
    Shield,
    Menu,
    X
} from 'lucide-react';
import { useState } from 'react';

/**
 * Header component with navigation
 * Responsive design with mobile menu toggle
 */
const Header = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Screening', href: '/screening', icon: FileSearch },
        { name: 'Candidates', href: '/candidate/1', icon: Users },
        { name: 'Interview', href: '/interview', icon: MessageSquare },
        { name: 'Fairness', href: '/fairness', icon: Shield },
    ];

    const isActive = (href) => {
        if (href === '/candidate/1') {
            return location.pathname.startsWith('/candidate');
        }
        return location.pathname === href;
    };

    return (
        <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50">
            <div className="container-custom">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:shadow-xl group-hover:shadow-primary-500/30 transition-all duration-300">
                            <Brain className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gradient">HireFlow AI</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(item.href)
                                            ? 'bg-primary-100 text-primary-700'
                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                    <nav className="md:hidden py-4 border-t border-slate-200 animate-fade-in">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(item.href)
                                            ? 'bg-primary-100 text-primary-700'
                                            : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                )}
            </div>
        </header>
    );
};

export default Header;
