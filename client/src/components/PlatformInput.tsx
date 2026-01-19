import React from 'react';
import type { IconType } from 'react-icons';

interface PlatformInputProps {
    id: string;
    label: string;
    Icon: IconType;
    iconColor: string;
    placeholder: string;
}

const PlatformInput: React.FC<PlatformInputProps> = ({
    id,
    label,
    Icon,
    iconColor,
    placeholder
}) => {
    return (
        <div className="group relative">
            <label className="sr-only" htmlFor={id}>Usuario de {label}</label>
            <div
                className="flex items-center bg-gray-50/50 dark:bg-input-dark/50 border border-gray-200 dark:border-gray-700/50 rounded-xl overflow-hidden transition-all duration-300 focus-within:ring-1 focus-within:ring-(--platform-color) focus-within:border-(--platform-color) focus-within:bg-white dark:focus-within:bg-input-dark group-hover:border-gray-300 dark:group-hover:border-gray-600"
                style={{ '--platform-color': iconColor } as React.CSSProperties}
            >
                <div className="p-4 flex items-center justify-center border-r border-gray-200 dark:border-gray-700/50 bg-gray-100/50 dark:bg-white/5 self-stretch">
                    <Icon
                        style={{ color: iconColor, fontSize: '24px' }}
                    />
                </div>
                <div className="flex-1 flex flex-col items-start px-4 py-3 text-left min-w-0">
                    <span
                        className="text-xs font-bold uppercase tracking-widest mb-1 opacity-90 truncate w-full"
                        style={{ color: iconColor }}
                    >
                        {label}
                    </span>
                    <input
                        className="w-full bg-transparent border-none p-0 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-0 outline-none text-sm font-semibold sm:leading-tight"
                        id={id}
                        placeholder={placeholder}
                        type="text"
                        autoComplete="off"
                    />
                </div>
            </div>
        </div>
    );
};

export default PlatformInput;
