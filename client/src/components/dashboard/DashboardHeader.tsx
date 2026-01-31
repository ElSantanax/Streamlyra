import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MdLink, MdHelpOutline, MdLogout, MdLanguage, MdCheck, MdKeyboardArrowDown, MdMenu } from 'react-icons/md';
import Logo from '../common/Logo';
import { Dropdown, DropdownItem, DropdownDivider, Badge } from '../ui';
import { useToggle, useAuth } from '../../hooks';

interface DashboardHeaderProps {
    onMenuClick?: () => void;
    onAddPlatform?: () => void;
    isConnected?: boolean;
}

const DashboardHeader = ({ onMenuClick, onAddPlatform, isConnected = false }: DashboardHeaderProps) => {
    const [isMenuOpen, , openMenu, closeMenu] = useToggle(false);
    const [showLanguages, toggleLanguages] = useToggle(false);
    const { user, logout } = useAuth();
    const [currentLanguage, setCurrentLanguage] = useState('es');

    const handleLogout = async () => {
        await logout();
    };

    const languages = [
        { code: 'es', label: 'Español' },
        { code: 'en', label: 'English' }
    ];

    return (
        <header className="shrink-0 border-b border-surface-border bg-background-dark/95 backdrop-blur-sm px-4 lg:px-6 py-4 flex items-center justify-between z-40">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                    aria-label="Toggle Sidebar"
                >
                    <MdMenu size={24} />
                </button>
                <Link to="/" className="transition-opacity hover:opacity-80">
                    <Logo textSize="text-xl" />
                </Link>
            </div>

            <div className="flex items-center gap-3">
                <Dropdown
                    isOpen={isMenuOpen}
                    onClose={closeMenu}
                    trigger={
                        <button
                            onClick={openMenu}
                            data-cy="user-menu-trigger"
                            className={`size-9 rounded-full border-2 transition-all overflow-hidden cursor-pointer hover:border-primary ${isMenuOpen ? 'border-primary ring-4 ring-primary/10' : 'border-surface-border'}`}
                        >
                            <img
                                src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"}
                                alt="User Avatar"
                                className="size-full object-cover"
                            />
                        </button>
                    }
                >
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-surface-border mb-1">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full border border-surface-border overflow-hidden shrink-0">
                                <img
                                    src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"}
                                    alt="User Avatar"
                                    className="size-full object-cover"
                                />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-white truncate">
                                        {user?.displayName || user?.username || "Usuario"}
                                    </span>
                                    <Badge
                                        variant={isConnected ? 'success' : 'error'}
                                        size="xs"
                                        withDot
                                        animated={isConnected}
                                    >
                                        {isConnected ? 'ONLINE' : 'OFFLINE'}
                                    </Badge>
                                </div>
                                {user?.username && (
                                    <span className="text-xs text-gray-500 truncate">@{user.username}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <DropdownItem
                        icon={<MdLink size={18} className="text-primary" />}
                        onClick={() => {
                            onAddPlatform?.();
                            closeMenu();
                        }}
                    >
                        Gestionar Conexiones
                    </DropdownItem>

                    {/* Language Selector Accordion */}
                    <div className="flex flex-col">
                        <button
                            onClick={toggleLanguages}
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
                                            closeMenu();
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

                    <DropdownItem icon={<MdHelpOutline size={18} />}>
                        Ayuda y Soporte
                    </DropdownItem>

                    <DropdownDivider />

                    <DropdownItem
                        icon={<MdLogout size={18} />}
                        onClick={handleLogout}
                        variant="danger"
                        data-cy="logout-button"
                    >
                        Cerrar Sesión
                    </DropdownItem>
                </Dropdown>
            </div>
        </header>
    );
};

export default DashboardHeader;
