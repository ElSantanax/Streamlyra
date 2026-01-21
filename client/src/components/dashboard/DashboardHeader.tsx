import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { MdLink, MdHelpOutline, MdLogout, MdLanguage, MdCheck, MdKeyboardArrowDown } from 'react-icons/md';
import Logo from '../common/Logo';

const AddPlatformModal = lazy(() => import('./AddPlatformModal'));

const DashboardHeader = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAddPlatformOpen, setIsAddPlatformOpen] = useState(false);
    const [showLanguages, setShowLanguages] = useState(false);
    const [currentLanguage, setCurrentLanguage] = useState('es');
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
                setShowLanguages(false); // Reset language toggle on close
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const languages = [
        { code: 'es', label: 'Español' },
        { code: 'en', label: 'English' }
    ];

    return (
        <>
            <header className="shrink-0 border-b border-surface-border bg-background-dark/95 backdrop-blur-sm px-6 py-4 flex items-center justify-between z-50">
                <Link to="/" className="transition-opacity hover:opacity-80">
                    <Logo textSize="text-xl" />
                </Link>

                <div className="flex items-center gap-3">
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`size-9 rounded-full border-2 transition-all overflow-hidden cursor-pointer hover:border-primary ${isMenuOpen ? 'border-primary ring-4 ring-primary/10' : 'border-surface-border'}`}
                        >
                            <img
                                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                                alt="User Avatar"
                                className="size-full object-cover"
                            />
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-card-dark border border-surface-border rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in duration-200 origin-top-right">
                                <div className="px-4 py-3 border-b border-surface-border mb-1">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white">Nombre de usuario</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setIsAddPlatformOpen(true);
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full px-4 py-2.5 flex items-center gap-3 text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium cursor-pointer"
                                >
                                    <MdLink size={18} className="text-primary" />
                                    <span>Gestionar Conexiones</span>
                                </button>

                                {/* Language Selector Accordion */}
                                <div className="flex flex-col">
                                    <button
                                        onClick={() => setShowLanguages(!showLanguages)}
                                        className={`w-full px-4 py-2.5 flex items-center justify-between text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium cursor-pointer ${showLanguages ? 'text-white bg-white/5' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <MdLanguage size={18} />
                                            <span>Cambiar Idioma</span>
                                        </div>
                                        <MdKeyboardArrowDown
                                            size={16}
                                            className={`transition-transform duration-200 ${showLanguages ? 'rotate-180' : ''}`}
                                        />
                                    </button>

                                    {showLanguages && (
                                        <div className="bg-black/20 py-1">
                                            {languages.map((lang) => (
                                                <button
                                                    key={lang.code}
                                                    onClick={() => {
                                                        setCurrentLanguage(lang.code);
                                                        setIsMenuOpen(false); // Optional: close menu on selection
                                                    }}
                                                    className="w-full pl-12 pr-4 py-2 flex items-center justify-between text-sm hover:bg-white/5 cursor-pointer group"
                                                >
                                                    <span className={`block ${currentLanguage === lang.code ? 'text-white font-semibold' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                                        {lang.label}
                                                    </span>
                                                    {currentLanguage === lang.code && <MdCheck size={14} className="text-primary" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <button className="w-full px-4 py-2.5 flex items-center gap-3 text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium cursor-pointer">
                                    <MdHelpOutline size={18} />
                                    <span>Ayuda y Soporte</span>
                                </button>

                                <div className="my-2 border-t border-surface-border mx-4"></div>

                                <button className="w-full px-4 py-2.5 flex items-center gap-3 text-red-400 hover:text-red-300 hover:bg-red-400/5 transition-colors text-sm font-medium cursor-pointer">
                                    <MdLogout size={18} />
                                    <span>Cerrar Sesión</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {isAddPlatformOpen && (
                <Suspense fallback={null}>
                    <AddPlatformModal
                        isOpen={isAddPlatformOpen}
                        onClose={() => setIsAddPlatformOpen(false)}
                    />
                </Suspense>
            )}
        </>
    );
};

export default DashboardHeader;
