import { memo, useCallback } from 'react';
import { MdReply, MdBlock, MdDeleteOutline, MdError } from 'react-icons/md';
import { PLATFORMS } from '../../../constants/platforms';
import { Button } from '../../ui/Button';
import { UserBadge } from '../../common/UserBadge';
import { parseMessageWithEmotes } from '../../../lib/formatters';
import type { PlatformKey } from '../../../constants/platforms';
import type { MessageStatus } from '../../../types/chat.types';

export interface ChatMessageProps {
    user: string;
    message: string;
    time: string;
    platform: PlatformKey;
    color?: string;
    isSub?: boolean;
    isMod?: boolean;
    isVIP?: boolean;
    isOwner?: boolean;
    specialMessage?: string;
    status?: MessageStatus;
    errorMessage?: string;
    // Campos para moderación
    messageId?: string;
    userId?: string;
    onReply?: (username: string) => void;
    onDelete?: (messageId: string) => void;
    onBan?: (userId: string, username: string) => void;
    // Emotes
    emotes?: Array<{
        id: string;
        name: string;
        url: string;
        positions: Array<[number, number]>;
    }>;
}

// Sub-components para mejorar la legibilidad y separación de responsabilidades
const StatusIndicator = ({ status, errorMessage }: { status?: MessageStatus; errorMessage?: string }) => {
    if (status !== 'error') return null;
    return (
        <div className="flex items-center gap-1 text-red-500" title={errorMessage || 'Error al enviar'}>
            <MdError size={14} />
            <span className="text-xs">Error</span>
        </div>
    );
};

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
    messageId,
    userId,
    onReply,
    onDelete,
    onBan,
    emotes,
}: ChatMessageProps) => {
    const { Icon, color, textColor, iconColor, brandColor } = PLATFORMS[platform];
    const isSpecial = !!specialMessage || isOwner || isMod || isSub || isVIP;
    const isYouTube = platform === 'youtube';

    const handleReply = useCallback(() => {
        if (onReply) onReply(user);
    }, [onReply, user]);

    const handleDelete = useCallback(() => {
        if (onDelete && messageId) onDelete(messageId);
    }, [onDelete, messageId]);

    const handleBan = useCallback(() => {
        if (onBan && userId) onBan(userId, user);
    }, [onBan, userId, user]);

    // Parsear mensaje con emotes
    const messageParts = parseMessageWithEmotes(message, emotes);

    return (
        <div className={`
            flex flex-col gap-1 px-4 py-3 rounded-xl bg-white/5 group border border-surface-border relative overflow-hidden transition-all
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
                            <Icon size={platform === 'tiktok' ? 10 : 12} className="md:hidden" />
                            <Icon size={platform === 'tiktok' ? 12 : 14} className="hidden md:block" />
                        </div>

                        {/* Mantenemos el wrapper para el escalado visual específico de este componente */}
                        {isOwner && <div className="shrink-0 scale-90 md:scale-100"><UserBadge type="streamer" isYouTube={isYouTube} /></div>}
                        {isMod && <div className="shrink-0 scale-90 md:scale-100"><UserBadge type="mod" isYouTube={isYouTube} /></div>}
                        {isVIP && <div className="shrink-0 scale-90 md:scale-100"><UserBadge type="vip" isYouTube={isYouTube} /></div>}
                        {isSub && <div className="shrink-0 scale-90 md:scale-100"><UserBadge type="sub" isYouTube={isYouTube} /></div>}

                        <span className="text-[10px] md:text-xs text-gray-500 font-medium ml-0.5 md:ml-1 shrink-0">{time}</span>
                        <StatusIndicator status={status} errorMessage={errorMessage} />
                    </div>

                    {platform !== 'system' && (
                        <div className="flex items-center gap-1 md:gap-1.5 ml-2 md:ml-4 transition-opacity shrink-0">
                            <Button
                                variant="ghost"
                                className="size-8! p-0! border border-surface-border text-gray-400 hover:text-white"
                                onClick={handleReply}
                                disabled={!onReply}
                                title="Responder"
                            >
                                <MdReply size={18} />
                            </Button>

                            <Button
                                variant="ghost"
                                className="size-8! p-0! border border-surface-border text-gray-400 hover:text-red-500 hover:bg-red-500/5 transition-colors"
                                onClick={handleBan}
                                disabled={!onBan || !userId}
                                title="Banear"
                            >
                                <MdBlock size={18} />
                            </Button>

                            <Button
                                variant="ghost"
                                className="size-8! p-0! border border-surface-border text-gray-400 hover:text-red-500 hover:bg-red-500/5 transition-colors"
                                onClick={handleDelete}
                                disabled={!onDelete || !messageId}
                                title="Eliminar Mensaje"
                            >
                                <MdDeleteOutline size={18} />
                            </Button>
                        </div>
                    )}
                </div>

                {specialMessage ? (
                    <p className={`text-sm font-black tracking-tight wrap-break-word ${platform === 'tiktok' ? 'text-[#FF0050]' : textColor} ${platform !== 'system' ? 'md:pr-32' : ''}`}>
                        {specialMessage}
                    </p>
                ) : (
                    <p className={`text-gray-200 text-sm leading-relaxed wrap-break-word ${platform !== 'system' ? 'md:pr-32' : ''}`}>
                        {messageParts.map((part, index) => {
                            if (part.type === 'emote') {
                                return (
                                    <img
                                        key={`${part.name}-${index}`}
                                        src={part.value}
                                        alt={part.name}
                                        title={part.name}
                                        className="inline-block h-7 align-middle mx-0.5"
                                        loading="lazy"
                                    />
                                );
                            }
                            return <span key={index}>{part.value}</span>;
                        })}
                    </p>
                )}
            </div>
        </div>
    );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;