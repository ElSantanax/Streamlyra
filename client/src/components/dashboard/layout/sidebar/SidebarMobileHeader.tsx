import { memo } from 'react';
import { FaTimes } from 'react-icons/fa';

interface SidebarMobileHeaderProps {
    onMobileClose?: () => void;
}

export const SidebarMobileHeader = memo(({ onMobileClose }: SidebarMobileHeaderProps) => (
    <div className="flex items-center justify-between lg:hidden mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-white">Menú de Control</span>
        <button
            onClick={onMobileClose}
            className="p-2 text-gray-500 hover:text-white transition-colors cursor-pointer"
        >
            <FaTimes size={18} />
        </button>
    </div>
));

SidebarMobileHeader.displayName = 'SidebarMobileHeader';
