import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaGlobe, FaBars, FaTimes } from 'react-icons/fa';
import Logo from './Logo';

const Navbar = () => {
    const { pathname } = useLocation();
    const [prevPathname, setPrevPathname] = useState(pathname);
    const isAuthPage = pathname === '/register' || pathname === '/connect' || pathname === '/login';
    const [lang, setLang] = useState<'es' | 'en'>('es');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Close menu when navigating (Adjusting state during render)
    if (pathname !== prevPathname) {
        setPrevPathname(pathname);
        if (isMenuOpen) setIsMenuOpen(false);
    }

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768 && isMenuOpen) setIsMenuOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isMenuOpen]);

    // Prevent scroll when menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [isMenuOpen]);

    const navLinks = (
        <>
            {isAuthPage ? (
                <Link to="/#features" className="text-slate-600 dark:text-white/80 hover:text-primary text-sm font-medium transition-colors">Funciones</Link>
            ) : (
                <a href="#features" className="text-slate-600 dark:text-white/80 hover:text-primary text-sm font-medium transition-colors">Funciones</a>
            )}
            <a href="#" className="text-slate-600 dark:text-white/80 hover:text-primary text-sm font-medium transition-colors">Comunidad</a>
        </>
    );

    const actionButton = isAuthPage ? (
        <Link to="/" className="w-full md:w-auto">
            <button className="flex w-full md:min-w-32 cursor-pointer items-center justify-center rounded-lg h-10 px-5 bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all">
                <span>Volver al Inicio</span>
            </button>
        </Link>
    ) : (
        <Link to="/register" className="w-full md:w-auto">
            <button className="flex w-full md:min-w-32 cursor-pointer items-center justify-center rounded-lg h-10 px-5 bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all">
                <span>Iniciar Sesión</span>
            </button>
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
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
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
                                className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-white/80 hover:text-primary transition-colors cursor-pointer"
                            >
                                <span className="font-bold">{lang === 'es' ? 'EN' : 'ES'}</span>
                                <FaGlobe className="size-4" />
                            </button>
                            {actionButton}
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay - Outside header to avoid backdrop-blur containing block issues */}
            <div
                className={`fixed inset-0 top-16.25 h-[calc(100vh-4.0625rem)] bg-background-light dark:bg-background-dark transition-transform duration-300 md:hidden z-40 ${isMenuOpen ? 'translate-y-0' : '-translate-y-full pointer-events-none'
                    }`}
            >
                <div className="flex flex-col p-8 gap-10 items-center justify-start h-full pt-16">
                    <nav className="flex flex-col gap-8 w-full items-center">
                        <div onClick={() => setIsMenuOpen(false)} className="flex flex-col gap-8 items-center text-xl">
                            {navLinks}
                        </div>
                    </nav>

                    <div className="w-full h-px bg-slate-100 dark:bg-surface-border"></div>

                    <div className="flex flex-col gap-8 w-full items-center">
                        <button
                            onClick={() => {
                                setLang(prev => prev === 'es' ? 'en' : 'es');
                                setIsMenuOpen(false);
                            }}
                            className="flex items-center gap-3 text-lg font-bold text-slate-600 dark:text-white/80 hover:text-primary transition-colors cursor-pointer"
                        >
                            <FaGlobe size={20} />
                            <span>{lang === 'es' ? 'Cambiar a Inglés' : 'Change to Spanish'}</span>
                        </button>
                        <div className="w-full" onClick={() => setIsMenuOpen(false)}>
                            {actionButton}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Navbar;

