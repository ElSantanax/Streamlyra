import React, { useState, useRef, useEffect } from 'react';
import { MdSettings, MdLink, MdHelpOutline, MdLogout, MdNotifications } from 'react-icons/md';
import Logo from '../common/Logo';

const DashboardHeader: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="shrink-0 border-b border-surface-border bg-background-dark/95 backdrop-blur-sm px-6 py-4 flex items-center justify-between z-50">
            <Logo textSize="text-xl" showText={true} />

            <div className="flex items-center gap-3">
                <button className="flex items-center justify-center size-9 rounded-lg bg-surface-dark text-gray-400 hover:text-white hover:bg-surface-border transition-colors cursor-pointer">
                    <MdNotifications size={20} />
                </button>

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
                                    <div className="size-8 rounded-lg bg-surface-dark flex items-center justify-center text-gray-400">
                                        <MdSettings size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white">Nombre de usuario</span>
                                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Streamer Pro</span>
                                    </div>
                                </div>
                            </div>

                            <button className="w-full px-4 py-2.5 flex items-center gap-3 text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium cursor-pointer">
                                <MdLink size={18} className="text-primary" />
                                <span>Gestionar Conexiones</span>
                            </button>

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
    );
};

export default DashboardHeader;
