import type { IconType } from 'react-icons';
import { FaCheckCircle } from 'react-icons/fa';
import type { CSSProperties } from 'react';

interface PlatformButtonProps {
    label: string;
    subtext?: string;
    Icon: IconType;
    iconColor: string;
    onClick?: () => void;
    className?: string;
    isConnected?: boolean;
}

const PlatformButton = ({
    label,
    subtext,
    Icon,
    iconColor,
    onClick,
    className = '',
    isConnected = false
}: PlatformButtonProps) => {
    return (
        <button
            onClick={onClick}
            disabled={isConnected}
            className={`group relative flex items-center justify-center gap-3 bg-transparent border-2 rounded-2xl transition-all duration-300 ${!isConnected ? 'active:scale-[0.98] cursor-pointer' : 'cursor-default'} w-full py-4 px-6 ${className} ${isConnected ? 'border-green-500/50 bg-green-500/5' : ''}`}
            style={{
                borderColor: isConnected ? undefined : `${iconColor}33`,
                backgroundColor: isConnected ? undefined : 'transparent',
            } as CSSProperties}
            onMouseEnter={(e) => {
                if (!isConnected) e.currentTarget.style.borderColor = iconColor;
            }}
            onMouseLeave={(e) => {
                if (!isConnected) e.currentTarget.style.borderColor = `${iconColor}33`;
            }}
        >

            <div className="flex items-center justify-center">
                <Icon
                    style={{ color: iconColor, fontSize: '28px' }}
                />
            </div>
            <div className="flex flex-col items-start text-left min-w-0 flex-1">
                <div className="flex items-center gap-2 w-full">
                    <span
                        className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate"
                    >
                        {label}
                    </span>
                    {isConnected && (
                        <span className="flex items-center text-green-500 text-[10px] font-bold uppercase tracking-wider bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                            Conectado
                        </span>
                    )}
                </div>
                {subtext && (
                    <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                        {subtext}
                    </span>
                )}
            </div>
            {isConnected && (
                <div className="text-green-500">
                    <FaCheckCircle size={20} />
                </div>
            )}
        </button>
    );
};

export default PlatformButton;
