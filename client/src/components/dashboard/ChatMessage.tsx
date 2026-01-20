import React from 'react';
import { FaTwitch, FaYoutube, FaTiktok, FaUserCircle } from 'react-icons/fa';
import { MdInfo } from 'react-icons/md';
import PlatformBadge from './ChatMessage/PlatformBadge';
import UserBadge from './ChatMessage/UserBadge';

interface ChatMessageProps {
    user: string;
    message: string;
    time: string;
    platform: 'twitch' | 'youtube' | 'tiktok' | 'system';
    avatar?: string;
    isSub?: boolean;
    isMod?: boolean;
    specialMessage?: string;
    highlighted?: boolean;
}

const platformConfig = {
    twitch: { Icon: FaTwitch, color: 'bg-[#9146FF]', textColor: 'text-[#9146FF]' },
    youtube: { Icon: FaYoutube, color: 'bg-[#FF0000]', textColor: 'text-[#FF4E45]' },
    tiktok: { Icon: FaTiktok, color: 'bg-black', textColor: 'text-white' },
    system: { Icon: MdInfo, color: 'bg-gray-500', textColor: 'text-gray-400' }
};

const ChatMessage: React.FC<ChatMessageProps> = ({
    user,
    message,
    time,
    platform,
    avatar,
    isSub,
    isMod,
    specialMessage,
    highlighted
}) => {
    const { Icon, color, textColor } = platformConfig[platform];

    return (
        <div className={`flex gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group ${highlighted ? 'bg-blue-500/5 border border-blue-500/10' : ''}`}>
            {platform === 'system' ? (
                <div className="size-10 shrink-0 flex items-start justify-center pt-1">
                    <Icon className="text-gray-500 text-[20px]" />
                </div>
            ) : (
                <div className="size-10 shrink-0 rounded-full flex items-center justify-center bg-surface-dark border border-surface-border overflow-hidden">
                    {avatar ? (
                        <div className="size-full bg-cover bg-center" style={{ backgroundImage: `url(${avatar})` }} />
                    ) : (
                        <FaUserCircle className="size-8 text-gray-600" />
                    )}
                </div>
            )}

            <div className="flex flex-col flex-1">
                <div className="flex items-baseline justify-between">
                    <div className="flex items-center gap-2">
                        <span className={`${textColor} font-bold text-sm`}>{user}</span>
                        {platform !== 'system' && (
                            <PlatformBadge Icon={Icon} color={color} />
                        )}
                        {isSub && <UserBadge type="sub" />}
                        {isMod && <UserBadge type="mod" />}
                        <span className="text-xs text-gray-600">{time}</span>
                    </div>
                    {platform !== 'system' && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="text-gray-500 hover:text-white" title="Responder">
                                <span className="material-symbols-outlined text-[18px]">reply</span>
                            </button>
                            <button className="text-gray-500 hover:text-red-400" title="Bloquear">
                                <span className="material-symbols-outlined text-[18px]">block</span>
                            </button>
                        </div>
                    )}
                </div>
                {specialMessage ? (
                    <p className={`text-sm leading-relaxed ${highlighted ? 'font-semibold text-blue-300' : 'text-gray-200'}`}>{specialMessage}</p>
                ) : (
                    <p className="text-gray-200 text-sm leading-relaxed">{message}</p>
                )}
            </div>
        </div>
    );
};

export default ChatMessage;
