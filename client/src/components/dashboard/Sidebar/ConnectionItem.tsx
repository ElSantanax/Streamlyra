import React from 'react';
import type { IconType } from 'react-icons';

interface ConnectionItemProps {
    platform: string;
    Icon: IconType;
    status: 'connected' | 'disconnected';
    viewers?: string;
    iconColor: string;
    bgColor: string;
    isConnected: boolean;
}

const ConnectionItem: React.FC<ConnectionItemProps> = ({
    platform,
    Icon,
    status,
    viewers,
    iconColor,
    bgColor,
    isConnected
}) => {
    return (
        <div className={`flex items-center justify-between p-3 rounded-lg bg-surface-dark border border-surface-border ${!isConnected ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center size-8 rounded-full ${bgColor} ${iconColor}`}>
                    <Icon size={platform === 'TikTok' ? 14 : 16} />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold leading-none">{platform}</span>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                        {isConnected && viewers && (
                            <>
                                <span className="text-[10px] text-gray-600">•</span>
                                <span className="text-xs text-gray-400">{viewers} espectadores</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className={`size-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
        </div>
    );
};

export default ConnectionItem;
