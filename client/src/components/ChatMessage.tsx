import React from 'react';

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
    const platformIcons = {
        twitch: { icon: 'videogame_asset', color: 'bg-[#9146FF]', textColor: 'text-[#9146FF]' },
        youtube: { icon: 'play_arrow', color: 'bg-[#FF0000]', textColor: 'text-[#FF4E45]' },
        tiktok: { icon: 'music_note', color: 'bg-black', textColor: 'text-blue-400' },
        system: { icon: 'info', color: 'bg-gray-500', textColor: 'text-gray-400' }
    };

    const { icon, color, textColor } = platformIcons[platform];

    return (
        <div className={`flex gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group ${highlighted ? 'bg-blue-500/5 border border-blue-500/10' : ''}`}>
            {platform === 'system' ? (
                <div className="w-10 shrink-0 flex items-start justify-center pt-1">
                    <span className={`material-symbols-outlined text-gray-500 text-[20px]`}>{icon}</span>
                </div>
            ) : (
                <div className="w-10 h-10 shrink-0 rounded-full bg-cover bg-center border border-surface-border relative" style={{ backgroundImage: `url(${avatar})` }}>
                    <div className={`absolute -bottom-1 -right-1 ${color} rounded-full p-0.5 border border-[#111318]`}>
                        <span className="material-symbols-outlined text-white text-[10px] block">{platform === 'tiktok' ? 'music_note' : icon}</span>
                    </div>
                </div>
            )}

            <div className="flex flex-col flex-1">
                <div className="flex items-baseline justify-between">
                    <div className="flex items-center gap-2">
                        <span className={`${textColor} font-bold text-sm`}>{user}</span>
                        {isSub && (
                            <span className="bg-[#9146FF]/20 text-[#9146FF] text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Sub</span>
                        )}
                        {isMod && (
                            <span className="bg-[#00AD03]/20 text-[#00AD03] text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">MOD</span>
                        )}
                        <span className="text-xs text-gray-600">{time}</span>
                    </div>
                    {platform !== 'system' && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="text-gray-500 hover:text-white" title="Reply"><span className="material-symbols-outlined text-[18px]">reply</span></button>
                            <button className="text-gray-500 hover:text-red-400" title="Ban"><span className="material-symbols-outlined text-[18px]">block</span></button>
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
