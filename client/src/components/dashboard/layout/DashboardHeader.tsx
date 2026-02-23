import { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { MdLink, MdHelpOutline, MdLogout, MdMenu } from 'react-icons/md';
import Logo from '../../common/Logo';
import { Dropdown, DropdownItem, DropdownDivider } from '../../ui';
import { useToggle, useAuth } from '../../../hooks';
import UserMenuHeader from './UserMenuHeader';
import LanguageSelector from './LanguageSelector';

interface DashboardHeaderProps {
    onMenuClick?: () => void;
    onAddPlatform?: () => void;
    isConnected?: boolean;
}

const DashboardHeader = memo(({ onMenuClick, onAddPlatform, isConnected = false }: DashboardHeaderProps) => {
    const [isMenuOpen, , openMenu, closeMenu] = useToggle(false);
    const { user, logout } = useAuth();
    const [currentLanguage, setCurrentLanguage] = useState('es');

    const handleLogout = async () => {
        await logout();
    };

    return (
        <header className="shrink-0 border-b border-surface-border bg-background-dark/95 backdrop-blur-sm px-4 lg:px-6 py-4 relative z-40">
            {/* Botón menú - solo visible en móviles */}
            <button
                onClick={onMenuClick}
                className="lg:hidden absolute left-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                aria-label="Toggle Sidebar"
            >
                <MdMenu size={24} />
            </button>

            {/* Logo centrado en móviles, alineado a la izquierda en desktop */}
            <div className="flex justify-center lg:justify-start">
                <Link to="/" className="transition-opacity hover:opacity-80">
                    <Logo textSize="text-xl" />
                </Link>
            </div>

            {/* Menú de usuario - siempre a la derecha */}
            <div className="absolute right-4 lg:right-6 top-1/2 -translate-y-1/2">
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
                                width={36}
                                height={36}
                            />
                        </button>
                    }
                >
                    <UserMenuHeader user={user} isConnected={isConnected} />

                    <DropdownItem
                        icon={<MdLink size={18} className="text-primary" />}
                        onClick={() => {
                            onAddPlatform?.();
                            closeMenu();
                        }}
                    >
                        Gestionar Conexiones
                    </DropdownItem>

                    <LanguageSelector
                        currentLanguage={currentLanguage}
                        onLanguageChange={setCurrentLanguage}
                        onClose={closeMenu}
                    />

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
});

DashboardHeader.displayName = 'DashboardHeader';

export default DashboardHeader;
