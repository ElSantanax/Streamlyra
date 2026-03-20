import { memo, useCallback, useMemo } from 'react';
import { PLATFORMS } from '../../../../constants/platforms';
import { UserBadge } from '../../../common/UserBadge';
import { StatusIndicator } from './components/StatusIndicator';
import { MessageActions } from './components/MessageActions';
import { MessageContent } from './components/MessageContent';
import { MdDiamond } from 'react-icons/md';
import { formatLocalTime } from '../../../../lib/formatters';
import type { ChatMessageProps } from './types';

const ChatMessage = memo(({
    user,
    message,
    time,
    platform,
    color: userColor,
    isSub,
    isMod,
    isVIP,
    isOwner,
    specialMessage,
    status,
    errorMessage,
    id,
    userId,
    onReply,
    onDelete,
    onBan,
    platformIds,
    emotes,
    bits,
}: ChatMessageProps) => {
    const { Icon, color, textColor, iconColor, brandColor } = PLATFORMS[platform];
    const isSpecial = !!specialMessage || isOwner || isMod || isSub || isVIP || (bits !== undefined && bits > 0);
    const isYouTube = platform === 'youtube';
    const isOwnMessage = user === 'Tú' || !!isOwner;
    const isTikTok = platform === 'tiktok';

    const formattedTime = useMemo(() => formatLocalTime(time), [time]);

    const handleReply = useCallback(() => {
        if (onReply) onReply(user);
    }, [onReply, user]);

    const handleDelete = useCallback(() => {
        if (onDelete && id) onDelete(id, platform, platformIds);
    }, [onDelete, id, platform, platformIds]);

    const handleBan = useCallback(() => {
        if (onBan && userId) onBan(userId, user, platform);
    }, [onBan, userId, user, platform]);

    return (
        <div className={`
            flex flex-col gap-1 px-4 py-3 rounded-xl bg-white/5 group border border-surface-border relative overflow-hidden
            ${isSpecial ? `border-l-4 font-medium` : ''}
        `} style={isSpecial ? { borderLeftColor: brandColor } : undefined}>

            <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between gap-2 overflow-hidden">
                    <div className="flex items-center gap-1.5 md:gap-2.5 min-w-0">
                        <span
                            className={`font-bold text-sm md:text-base tracking-tight truncate ${!userColor ? textColor : ''}`}
                            style={userColor ? { color: userColor } : undefined}
                        >
                            {user}
                        </span>

                        <div className={`flex items-center justify-center size-5 md:size-6 rounded-full shrink-0 ${color} ${iconColor} shadow-sm ring-1 ring-white/10`}>
                            <Icon size={isTikTok ? 10 : 12} className="md:hidden" />
                            <Icon size={isTikTok ? 12 : 14} className="hidden md:block" />
                        </div>

                        {/* Badges - No mostrar si el usuario es "Tú" */}
                        {isOwner && user !== 'Tú' && <UserBadge type="streamer" isYouTube={isYouTube} />}
                        {isMod && <UserBadge type="mod" isYouTube={isYouTube} />}
                        {isVIP && <UserBadge type="vip" isYouTube={isYouTube} />}
                        {isSub && <UserBadge type="sub" isYouTube={isYouTube} />}

                        {bits !== undefined && bits > 0 && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-500 animate-pulse-slow">
                                <MdDiamond size={14} />
                                <span className="text-[10px] md:text-xs font-black">{bits}</span>
                            </div>
                        )}

                        <span className="text-[10px] md:text-xs text-gray-500 font-medium ml-0.5 md:ml-1 shrink-0">{formattedTime}</span>
                        <StatusIndicator status={status} errorMessage={errorMessage} />
                    </div>

                    <MessageActions
                        platform={platform}
                        isOwnMessage={isOwnMessage}
                        isTikTok={isTikTok}
                        userId={userId}
                        id={id}
                        onReply={handleReply}
                        onDelete={handleDelete}
                        onBan={handleBan}
                    />
                </div>

                <MessageContent
                    message={message}
                    specialMessage={specialMessage}
                    platform={platform}
                    textColor={textColor}
                    emotes={emotes}
                />
            </div>
        </div>
    );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
export type { ChatMessageProps } from './types';
