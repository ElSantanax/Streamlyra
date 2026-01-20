import React from 'react';
import { MdReply, MdBlock, MdDeleteOutline } from 'react-icons/md';
import { PLATFORMS } from '../../constants/platforms';
import type { PlatformKey } from '../../constants/platforms';

// --- Local Components (KISS: Co-located) ---

interface UserBadgeProps {
    type: 'sub' | 'mod';
}

const UserBadge: React.FC<UserBadgeProps> = ({ type }) => {
    const config = {
        sub: { label: 'Sub', color: 'bg-[#9146FF]/20 text-[#9146FF]' },
        mod: { label: 'MOD', color: 'bg-[#00AD03]/20 text-[#00AD03]' }
    };

    const { label, color } = config[type];

    return (
        <span className={`${color} text-[11px] px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider`}>
            {label}
        </span>
    );
};

// --- Main ChatMessage Component ---

interface ChatMessageProps {
    user: string;
    message: string;
    time: string;
    platform: PlatformKey;
    isSub?: boolean;
    isMod?: boolean;
    specialMessage?: string;
    highlighted?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
    user,
    message,
    time,
    platform,
    isSub,
    isMod,
    specialMessage,
    highlighted
}) => {
    const { Icon, color, textColor, iconColor, brandColor } = PLATFORMS[platform];
    const isSpecial = !!specialMessage;

    return (
        <div className={`
            flex flex-col gap-1 px-4 py-3 rounded-xl bg-white/5 group border border-surface-border relative overflow-hidden transition-all
            ${isSpecial ? `border-l-4 font-medium` : ''}
            ${highlighted ? 'bg-blue-500/10 border-blue-500/20' : ''}
        `} style={isSpecial ? { borderLeftColor: brandColor } : undefined}>

            <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between gap-2 overflow-hidden">
                    <div className="flex items-center gap-1.5 md:gap-2.5 min-w-0">
                        <span className={`${textColor} font-bold text-sm md:text-base tracking-tight truncate`}>{user}</span>
                        <div className={`flex items-center justify-center size-5 md:size-6 rounded-full shrink-0 ${color} ${iconColor} shadow-sm ring-1 ring-white/10`}>
                            <Icon size={platform === 'tiktok' ? 10 : 12} className="md:hidden" />
                            <Icon size={platform === 'tiktok' ? 12 : 14} className="hidden md:block" />
                        </div>
                        {isSub && <div className="shrink-0 scale-90 md:scale-100"><UserBadge type="sub" /></div>}
                        {isMod && <div className="shrink-0 scale-90 md:scale-100"><UserBadge type="mod" /></div>}
                        <span className="text-[10px] md:text-xs text-gray-600 font-medium ml-0.5 md:ml-1 shrink-0">{time}</span>
                    </div>
                    {platform !== 'system' && (
                        <div className="flex items-center gap-1 md:gap-1.5 ml-2 md:ml-4 transition-opacity shrink-0">
                            <button
                                className="flex items-center justify-center size-8 text-gray-400 hover:text-white hover:bg-white/5 border border-surface-border rounded-lg transition-all cursor-pointer"
                                title="Responder"
                            >
                                <MdReply size={18} />
                            </button>
                            <button
                                className="flex items-center justify-center size-8 text-gray-400 hover:text-red-400 hover:bg-red-500/5 border border-surface-border rounded-lg transition-all cursor-pointer"
                                title="Banear"
                            >
                                <MdBlock size={18} />
                            </button>
                            <button
                                className="flex items-center justify-center size-8 text-gray-400 hover:text-red-500 hover:bg-red-500/5 border border-surface-border rounded-lg transition-all cursor-pointer"
                                title="Eliminar Mensaje"
                            >
                                <MdDeleteOutline size={18} />
                            </button>
                        </div>
                    )}
                </div>
                {specialMessage ? (
                    <p className={`text-sm font-black tracking-tight ${platform === 'tiktok' ? 'text-[#FF0050]' : textColor}`}>
                        {specialMessage}
                    </p>
                ) : (
                    <p className="text-gray-200 text-sm leading-relaxed">{message}</p>
                )}
            </div>
        </div>
    );
};

export default ChatMessage;
