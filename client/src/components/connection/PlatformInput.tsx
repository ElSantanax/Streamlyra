import { FaArrowRight } from 'react-icons/fa';
import type { IconType } from 'react-icons';
import type { ChangeEvent, CSSProperties } from 'react';

interface PlatformInputProps {
    id: string;
    label: string;
    Icon: IconType;
    iconColor: string;
    placeholder: string;
    value?: string;
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    onConnect?: () => void;
    isConnected?: boolean;
}

const PlatformInput = ({
    id,
    label,
    Icon,
    iconColor,
    placeholder,
    value,
    onChange,
    onConnect,
    isConnected = false
}: PlatformInputProps) => {
    return (
        <div className="group relative">
            <label className="sr-only" htmlFor={id}>Usuario de {label}</label>
            <div
                className={`flex items-center bg-gray-50/50 dark:bg-input-dark/50 border ${isConnected ? 'border-green-500/50 bg-green-500/5' : 'border-gray-200 dark:border-gray-700/50'} rounded-xl overflow-hidden transition-all duration-300 focus-within:ring-1 focus-within:ring-(--platform-color) focus-within:border-(--platform-color) focus-within:bg-white dark:focus-within:bg-input-dark group-hover:border-gray-300 dark:group-hover:border-gray-600`}
                style={{ '--platform-color': iconColor } as CSSProperties}
            >
                <div className={`p-4 flex items-center justify-center border-r ${isConnected ? 'border-green-500/20 bg-green-500/10' : 'border-gray-200 dark:border-gray-700/50 bg-gray-100/50 dark:bg-white/5'} self-stretch`}>
                    <Icon
                        style={{ color: isConnected ? '#22c55e' : iconColor, fontSize: '24px' }}
                    />
                </div>
                <div className="flex-1 flex flex-col items-start px-4 py-3 text-left min-w-0">
                    <span
                        className={`text-xs font-bold uppercase tracking-widest mb-1 opacity-90 truncate w-full ${isConnected ? 'text-green-500' : ''}`}
                        style={{ color: isConnected ? undefined : iconColor }}
                    >
                        {isConnected ? `${label} Conectado` : label}
                    </span>
                    <input
                        className="w-full bg-transparent border-none p-0 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-0 outline-none text-sm font-semibold sm:leading-tight disabled:opacity-50"
                        id={id}
                        placeholder={placeholder}
                        autoComplete="off"
                        value={value}
                        onChange={onChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && value && !isConnected && onConnect) {
                                onConnect();
                            }
                        }}
                        disabled={isConnected}
                    />
                </div>
                {value && !isConnected && onConnect && (
                    <button
                        onClick={onConnect}
                        className="mr-2 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 cursor-pointer"
                        title="Conectar"
                    >
                        <FaArrowRight size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default PlatformInput;
