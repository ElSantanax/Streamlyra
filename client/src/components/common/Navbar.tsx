import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaGlobe, FaBars, FaTimes } from 'react-icons/fa';
import Logo from './Logo';

const Navbar = () => {
    const { pathname } = useLocation();
    const isAuthPage = pathname === '/register' || pathname === '/connect' || pathname === '/login';
    const [lang, setLang] = useState<'es' | 'en'>('es');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const isAuthenticated = !!localStorage.getItem('token');

    // Close menu on resize to desktop and prevent scroll when open
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) setIsMenuOpen(false);
        };
        
        document.body.style.overflow = isMenuOpen ? 'hidden' : 'unset';
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            document.body.style.overflow = 'unset';
        };
    }, [isMenuOpen]);

    const navLinks = (
        <>
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
        <Link to={isAuthenticated ? "/dashboard" : "/login"} className="w-full md:w-auto">
            <button className="flex w-full md:min-w-32 cursor-pointer items-center justify-center rounded-lg h-10 px-5 bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all">
                <span>{isAuthenticated ? 'Ir al Panel' : 'Iniciar Sesión'}</span>
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

            {/* Overlay */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 md:hidden z-40"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Mobile Menu Drawer */}
            <div
                className={`fixed top-0 right-0 h-full w-70 bg-background-dark border-l border-surface-border/50 shadow-2xl transition-transform duration-300 ease-out md:hidden z-50 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Drawer Header - Perfectly Balanced */}
                    <div className="flex items-center justify-between px-6 h-18 border-b border-surface-border/30">
                        <div className="flex items-center gap-3">
                            <Logo textSize="text-lg" showText={false} />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Menú</span>
                        </div>
                        <button
                            onClick={() => setIsMenuOpen(false)}
                            className="size-10 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer -mr-2"
                        >
                            <FaTimes size={18} />
                        </button>
                    </div>

                    <div className="flex flex-col p-6 gap-8 overflow-y-auto">
                        <nav className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Explorar</span>
                            <div className="flex flex-col gap-1.5">
                                <a href="#" onClick={() => setIsMenuOpen(false)} className="flex items-center px-4 py-3.5 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white hover:translate-x-1 transition-all font-semibold text-[15px]">Comunidad</a>
                            </div>
                        </nav>

                        <div className="h-px bg-surface-border/40 mx-2" />

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Personalización</span>
                            <button
                                onClick={() => {
                                    setLang(prev => prev === 'es' ? 'en' : 'es');
                                }}
                                className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white transition-all font-semibold text-[15px] cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                        <FaGlobe size={14} />
                                    </div>
                                    <span>Idioma</span>
                                </div>
                                <div className="flex items-center gap-2 bg-surface-border/30 px-2.5 py-1 rounded-lg border border-surface-border/50">
                                    <span className="text-[10px] font-bold text-white uppercase tracking-tighter">{lang === 'es' ? 'ES' : 'EN'}</span>
                                </div>
                            </button>
                        </div>

                        <div className="mt-auto pt-8" onClick={() => setIsMenuOpen(false)}>
                            {actionButton}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Navbar;

