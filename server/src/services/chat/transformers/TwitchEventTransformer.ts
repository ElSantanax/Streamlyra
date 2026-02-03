import { NormalizedChatMessage } from './EventTransformer';
import { BaseEventTransformer } from './BaseEventTransformer';

export class TwitchEventTransformer extends BaseEventTransformer {
    protected readonly platformName = 'twitch';

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transformMessage(_data: unknown): NormalizedChatMessage {
        throw new Error('Use transformChatMessage(tags, message) instead');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transformSpecialEvent(_data: unknown): NormalizedChatMessage {
        throw new Error('Use transformSubscription, transformResub, or transformCheer instead');
    }

    transformChatMessage(tags: Record<string, unknown>, message: string): NormalizedChatMessage {
        const emotes = this.parseEmotes(tags.emotes, message);

        return {
            id: (tags.id as string) || Date.now().toString(),
            platform: 'twitch',
            user: (tags['display-name'] as string) || (tags.username as string) || 'Unknown',
            message,
            time: this.formatTime(new Date()),
            color: '#9146FF',
            isMod: (tags.mod as boolean) || false,
            isSub: (tags.subscriber as boolean) || false,
            isVIP: !!(tags.vip as boolean),
            isOwner: (tags.badges as Record<string, string>)?.broadcaster === '1',
            messageId: (tags.id as string) || undefined,
            userId: (tags['user-id'] as string) || undefined,
            roomId: (tags['room-id'] as string) || undefined,
            emotes: emotes.length > 0 ? emotes : undefined
        };
    }

    /**
     * Parsea los emotes de Twitch desde tags.emotes
     * Formato: { "emoteId": ["start-end", "start-end"] }
     * Ejemplo: { "425618": ["27-29", "31-33"] }
     */
    private parseEmotes(emotesData: unknown, message: string): Array<{
        id: string;
        name: string;
        url: string;
        positions: Array<[number, number]>;
    }> {
        if (!emotesData || typeof emotesData !== 'object') {
            return [];
        }

        const emotes: Array<{
            id: string;
            name: string;
            url: string;
            positions: Array<[number, number]>;
        }> = [];

        const emotesObj = emotesData as Record<string, string[]>;

        for (const [emoteId, positions] of Object.entries(emotesObj)) {
            const parsedPositions: Array<[number, number]> = [];
            let emoteName = '';

            for (const pos of positions) {
                const [start, end] = pos.split('-').map(Number);
                if (!isNaN(start) && !isNaN(end)) {
                    parsedPositions.push([start, end]);
                    
                    // Extraer el nombre del emote del mensaje (solo una vez)
                    if (!emoteName && message) {
                        emoteName = message.substring(start, end + 1);
                    }
                }
            }

            if (parsedPositions.length > 0) {
                emotes.push({
                    id: emoteId,
                    name: emoteName,
                    url: `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/1.0`,
                    positions: parsedPositions
                });
            }
        }

        return emotes;
    }

    transformSubscription(username: string, message: string, tags: Record<string, unknown>): NormalizedChatMessage {
        return {
            id: (tags?.['id'] as string) || Date.now().toString(),
            platform: 'twitch',
            user: username,
            message: message || '',
            specialMessage: '¡NUEVA SUSCRIPCIÓN! 🥳',
            time: this.formatTime(new Date()),
            isSub: true
        };
    }

    transformResub(username: string, message: string, tags: Record<string, unknown>): NormalizedChatMessage {
        return {
            id: (tags?.['id'] as string) || Date.now().toString(),
            platform: 'twitch',
            user: username,
            message: message || '',
            specialMessage: '¡RE-SUSCRIPCIÓN! 🔥',
            time: this.formatTime(new Date()),
            isSub: true
        };
    }

    transformCheer(userstate: Record<string, unknown>, message: string): NormalizedChatMessage {
        return {
            id: (userstate.id as string) || Date.now().toString(),
            platform: 'twitch',
            user: (userstate['display-name'] as string) || (userstate.username as string) || 'Unknown',
            message: message || '',
            specialMessage: `¡HA ENVIADO ${userstate.bits} BITS! 💎`,
            time: this.formatTime(new Date())
        };
    }
}