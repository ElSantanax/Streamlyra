import { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaGlobe, FaBars, FaTimes, FaGithub } from 'react-icons/fa';
import Logo from './Logo';
import { Button } from '../ui';
import { useToggle } from '../../hooks';
import { useAuth } from '../../hooks/useAuth';

const MobileMenu = lazy(() => import('./MobileMenu'));

const Navbar = () => {
    const { pathname } = useLocation();
    const { isAuthenticated } = useAuth();
    const isAuthPage = pathname === '/register' || pathname === '/connect' || pathname === '/login';
    const [lang, setLang] = useState<'es' | 'en'>('es');
    const [isMenuOpen, toggleMenu, , closeMenu] = useToggle(false);

    // Close menu on resize to desktop and prevent scroll when open
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) closeMenu();
        };

        document.body.style.overflow = isMenuOpen ? 'hidden' : 'unset';
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            document.body.style.overflow = 'unset';
        };
    }, [isMenuOpen, closeMenu]);

    const navLinks = (
        <>
            <a
                href="https://github.com/ElSantanax/Streamlyra"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Repositorio de GitHub"
                className="flex items-center gap-2 text-white hover:text-primary text-sm font-medium transition-colors"
            >
                <FaGithub className="size-4" />
            </a>
        </>
    );

    const actionButton = isAuthPage ? (
        <Link to="/" className="w-full md:w-auto">
            <Button variant="primary" fullWidth className="md:min-w-32">
                Volver al Inicio
            </Button>
        </Link>
    ) : (
        <Link to={isAuthenticated ? "/dashboard" : "/login"} className="w-full md:w-auto">
            <Button variant="primary" fullWidth className="md:min-w-32">
                {isAuthenticated ? 'Ir al Panel' : 'Iniciar Sesión'}
            </Button>
        </Link>
    );

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b border-solid border-gray-200 dark:border-surface-border bg-white/80 dark:bg-background-dark/80 backdrop-blur-md px-6 lg:px-40 py-3">
                <div className="mx-auto flex max-w-300 items-center justify-between whitespace-nowrap">
                    <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80 relative z-50">
                        <Logo textSize="text-xl" />
                    </Link>

                    <div className="flex items-center gap-4 md:hidden">
                        <button
                            onClick={toggleMenu}
                            className="p-2 text-slate-600 dark:text-white/80 hover:text-primary transition-colors relative z-50"
                            aria-label="Menu"
                        >
                            {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
                        </button>
                    </div>

                    <div className="hidden md:flex flex-1 justify-end gap-6 items-center">
                        <nav className="flex items-center gap-8">
                            {navLinks}
                        </nav>

                        <div className="h-4 w-px bg-gray-200 dark:bg-surface-border hidden sm:block"></div>

                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => setLang(prev => prev === 'es' ? 'en' : 'es')}
                                className="flex items-center gap-2 text-sm font-medium text-white hover:text-primary transition-colors cursor-pointer"
                            >
                                <span className="font-bold">{lang === 'es' ? 'EN' : 'ES'}</span>
                                <FaGlobe className="size-4" />
                            </button>
                            {actionButton}
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Menu - Lazy Loaded */}
            <Suspense fallback={null}>
                <MobileMenu
                    isOpen={isMenuOpen}
                    onClose={closeMenu}
                    isAuthenticated={isAuthenticated}
                    isAuthPage={isAuthPage}
                    lang={lang}
                    onLanguageToggle={() => setLang(prev => prev === 'es' ? 'en' : 'es')}
                />
            </Suspense>
        </>
    );
};

export default Navbar;
