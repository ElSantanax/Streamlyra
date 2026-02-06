import { Link } from 'react-router-dom';
import { FaGlobe, FaTimes, FaGithub } from 'react-icons/fa';
import { Button } from '../ui';

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    isAuthenticated: boolean;
    isAuthPage: boolean;
    lang: 'es' | 'en';
    onLanguageToggle: () => void;
}

const MobileMenu = ({
    isOpen,
    onClose,
    isAuthenticated,
    isAuthPage,
    lang,
    onLanguageToggle
}: MobileMenuProps) => {
    const actionButton = isAuthPage ? (
        <Link to="/" className="w-full" onClick={onClose}>
            <Button variant="primary" fullWidth>
                Volver al Inicio
            </Button>
        </Link>
    ) : (
        <Link to={isAuthenticated ? "/dashboard" : "/login"} className="w-full" onClick={onClose}>
            <Button variant="primary" fullWidth>
                {isAuthenticated ? 'Ir al Panel' : 'Iniciar Sesión'}
            </Button>
        </Link>
    );

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 md:hidden z-40"
                    onClick={onClose}
                />
            )}

            {/* Mobile Menu Drawer */}
            <div
                className={`fixed top-0 right-0 h-full w-70 bg-background-dark border-l border-surface-border/50 shadow-2xl transition-transform duration-300 ease-out md:hidden z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full uppercase tracking-widest">
                    {/* Drawer Header */}
                    <div className="flex items-center justify-between px-6 h-18 border-b border-surface-border/30">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Menú</span>
                        <button
                            onClick={onClose}
                            className="size-10 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer -mr-2"
                        >
                            <FaTimes size={18} />
                        </button>
                    </div>

                    <div className="flex flex-col p-6 gap-8 overflow-y-auto">
                        <nav className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Explorar</span>
                            <div className="flex flex-col gap-1.5">
                                <a
                                    href="https://github.com/ElSantanax/Streamlyra"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={onClose}
                                    aria-label="Repositorio de GitHub"
                                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-white/5 text-white hover:text-white hover:translate-x-1 transition-all font-semibold text-[15px]"
                                >
                                    <FaGithub className="size-5" />
                                </a>
                            </div>
                        </nav>

                        <div className="h-px bg-surface-border/40 mx-2" />

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Personalización</span>
                            <button
                                onClick={onLanguageToggle}
                                className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-white/5 text-white hover:text-white transition-all font-semibold text-[15px] cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-white group-hover:bg-primary group-hover:text-white transition-colors">
                                        <FaGlobe size={14} />
                                    </div>
                                    <span>Idioma</span>
                                </div>
                                <div className="flex items-center gap-2 bg-surface-border/30 px-2.5 py-1 rounded-lg border border-surface-border/50">
                                    <span className="text-[10px] font-bold text-white uppercase tracking-tighter">{lang === 'es' ? 'ES' : 'EN'}</span>
                                </div>
                            </button>
                        </div>

                        <div className="mt-auto pt-8">
                            {actionButton}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MobileMenu;
