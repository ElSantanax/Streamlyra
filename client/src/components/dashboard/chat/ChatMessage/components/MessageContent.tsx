import { memo, useMemo } from 'react';
import { parseMessageWithEmotes } from '../../../../../lib/formatters';
import type { PlatformKey } from '../../../../../constants/platforms';

interface MessageContentProps {
    message: string;
    specialMessage?: string;
    platform: PlatformKey;
    textColor: string;
    emotes?: Array<{
        id: string;
        name: string;
        url: string;
        positions: Array<[number, number]>;
    }>;
}

export const MessageContent = memo(({
    message,
    specialMessage,
    platform,
    textColor,
    emotes
}: MessageContentProps) => {
    const messageParts = useMemo(() => parseMessageWithEmotes(message, emotes), [message, emotes]);
    const isSystem = platform === 'system';
    const isTikTok = platform === 'tiktok';

    return (
        <>
            {specialMessage ? (
                <p className={`text-sm font-black tracking-tight wrap-break-word ${isTikTok ? 'text-[#FF0050]' : textColor} ${!isSystem ? 'md:pr-32' : ''}`}>
                    {specialMessage}
                </p>
            ) : (
                <p className={`text-gray-200 text-sm leading-relaxed wrap-break-word ${!isSystem ? 'md:pr-32' : ''}`}>
                    {messageParts.map((part, index) => {
                        if (part.type === 'emote') {
                            return (
                                <img
                                    key={`${part.name}-${index}`}
                                    src={part.value}
                                    alt={part.name}
                                    title={part.name}
                                    className="inline-block h-7 w-7 object-contain align-middle mx-0.5"
                                    width={28}
                                    height={28}
                                />
                            );
                        }
                        if (part.type === 'link') {
                            return (
                                <a
                                    key={`link-${index}`}
                                    href={part.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline hover:text-primary/80 transition-colors break-all"
                                    title={part.url}
                                >
                                    {part.value}
                                </a>
                            );
                        }
                        return <span key={index}>{part.value}</span>;
                    })}
                </p>
            )}
        </>
    );
});

MessageContent.displayName = 'MessageContent';
