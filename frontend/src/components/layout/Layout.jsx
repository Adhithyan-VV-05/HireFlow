import Header from './Header';
import Footer from './Footer';

/**
 * Layout wrapper component
 * Includes Header and Footer with main content area
 */
const Layout = ({ children, showFooter = true }) => {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
                {children}
            </main>
            {showFooter && <Footer />}
        </div>
    );
};

export default Layout;
