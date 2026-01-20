import React from 'react';
import type { IconType } from 'react-icons';

interface PlatformButtonProps {
    label: string;
    subtext?: string;
    Icon: IconType;
    iconColor: string;
    onClick?: () => void;
    className?: string;
}

const PlatformButton: React.FC<PlatformButtonProps> = ({
    label,
    subtext,
    Icon,
    iconColor,
    onClick,
    className = ''
}) => {
    return (
        <button
            onClick={onClick}
            className={`group relative flex items-center justify-center gap-3 bg-transparent border-2 border-[#9146FF]/20 rounded-2xl transition-all duration-300 hover:border-[#9146FF] active:scale-[0.98] cursor-pointer w-full py-4 px-6 ${className}`}
        >
            <div className="flex items-center justify-center">
                <Icon
                    style={{ color: iconColor, fontSize: '28px' }}
                />
            </div>
            <div className="flex flex-col items-start text-left min-w-0">
                <span
                    className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate w-full"
                >
                    {label}
                </span>
                {subtext && (
                    <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                        {subtext}
                    </span>
                )}
            </div>
        </button>
    );
};

export default PlatformButton;
