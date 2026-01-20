import React from 'react';
import type { IconType } from 'react-icons';

interface PlatformButtonProps {
    label: string;
    Icon: IconType;
    iconColor: string;
    onClick?: () => void;
}

const PlatformButton: React.FC<PlatformButtonProps> = ({
    label,
    Icon,
    iconColor,
    onClick
}) => {
    return (
        <button
            onClick={onClick}
            className="group relative flex items-center bg-gray-50/50 dark:bg-input-dark/50 border border-gray-200 dark:border-gray-700/50 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-white dark:hover:bg-input-dark active:scale-[0.97] cursor-pointer w-full"
        >
            <div
                className="p-4 flex items-center justify-center border-r border-gray-200 dark:border-gray-700/50 bg-gray-100/50 dark:bg-white/5 self-stretch"
            >
                <Icon
                    style={{ color: iconColor, fontSize: '24px' }}
                    className="transition-transform duration-300 group-hover:scale-110"
                />
            </div>
            <div className="flex-1 flex flex-col items-start px-4 py-3 text-left min-w-0">
                <span
                    className="text-xs font-bold uppercase tracking-widest mb-1 opacity-90 truncate w-full"
                    style={{ color: iconColor }}
                >
                    {label}
                </span>
                <span className="text-slate-900 dark:text-white text-sm font-semibold whitespace-nowrap">
                    Iniciar sesión
                </span>
            </div>
        </button>
    );
};

export default PlatformButton;
