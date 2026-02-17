import { TwitchFollowEventSub, TwitchSubEventSub, TwitchRaidEventSub, TwitchChatMessageEventSub } from '../../../types/twitch.types';
import { NormalizedChatMessage } from './EventTransformer';
import { BaseEventTransformer } from './BaseEventTransformer';

export class TwitchEventTransformer extends BaseEventTransformer {
    protected readonly platformName = 'twitch';

    transformMessage(_data: unknown): NormalizedChatMessage {
        throw new Error('Use transformChatMessage(tags, message) or transformEventSubChatMessage(event) instead');
    }

    transformSpecialEvent(_data: unknown): NormalizedChatMessage {
        throw new Error('Use EventSub specific transformation methods');
    }

    /**
     * MÉTODOS IRC (Compatibilidad con tmi.js)
     */

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
            isVIP: !!(tags.vip) || (tags.badges as Record<string, string>)?.vip === '1',
            isOwner: (tags.badges as Record<string, string>)?.broadcaster === '1',
            messageId: (tags.id as string) || undefined,
            userId: (tags['user-id'] as string) || undefined,
            roomId: (tags['room-id'] as string) || undefined,
            emotes: emotes.length > 0 ? emotes : undefined
        };
    }

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

    /**
     * --- MÉTODOS EVENTSUB (Webhooks) ---
     */

    transformEventSubFollow(event: TwitchFollowEventSub): NormalizedChatMessage {
        const followedAtTs = new Date(event.followed_at).getTime();
        return {
            id: `twitch-follow-${event.user_id}-${followedAtTs}`,
            platform: 'twitch',
            user: event.user_name,
            message: '',
            specialMessage: '👤 NUEVO SEGUIDOR',
            time: this.formatTime(new Date(event.followed_at)),
            color: '#9146FF',
            isSpecial: true,
            userId: event.user_id
        };
    }

    transformEventSubSubscription(event: TwitchSubEventSub): NormalizedChatMessage {
        return {
            id: `twitch-sub-${event.user_id}-${Date.now()}`,
            platform: 'twitch',
            user: event.user_name,
            message: '',
            specialMessage: event.is_gift ? '🎁 ¡Suscripción de Regalo!' : '🥳 ¡Nueva Suscripción!',
            time: this.formatTime(new Date()),
            color: '#9146FF',
            isSub: true,
            userId: event.user_id
        };
    }

    transformEventSubRaid(event: TwitchRaidEventSub): NormalizedChatMessage {
        return {
            id: `twitch-raid-${event.from_broadcaster_user_id}-${Date.now()}`,
            platform: 'twitch',
            user: event.from_broadcaster_user_name,
            message: '',
            specialMessage: `🚨 ¡RAID CON ${event.viewers} ESPECTADORES!`,
            time: this.formatTime(new Date()),
            color: '#9146FF',
            isSpecial: true,
            userId: event.from_broadcaster_user_id
        };
    }

    transformEventSubChatMessage(event: TwitchChatMessageEventSub): NormalizedChatMessage {
        const emotes = (event.message.fragments || [])
            .filter(f => f.type === 'emote' && f.emote)
            .map(f => {
                const emote = f.emote!;
                return {
                    id: emote.id,
                    name: f.text,
                    url: `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark/1.0`,
                    positions: [] as Array<[number, number]>
                };
            });

        // Calcular total de bits si hay cheermotes
        const totalBits = (event.message.fragments || [])
            .filter(f => f.type === 'cheermote' && f.cheermote)
            .reduce((acc, f) => acc + (f.cheermote?.bits || 0), 0);

        return {
            id: event.message_id,
            platform: 'twitch',
            user: event.chatter_user_name,
            message: event.message.text,
            time: this.formatTime(new Date()),
            color: event.color || '#9146FF',
            isMod: event.badges?.some(b => b.set_id === 'moderator') || false,
            isSub: event.badges?.some(b => b.set_id === 'subscriber' || b.set_id === 'founder') || false,
            isVIP: event.badges?.some(b => b.set_id === 'vip') || false,
            isOwner: event.badges?.some(b => b.set_id === 'broadcaster') || false,
            messageId: event.message_id,
            userId: event.chatter_user_id,
            roomId: event.broadcaster_user_id,
            emotes: emotes.length > 0 ? emotes : undefined,
            bits: totalBits > 0 ? totalBits : undefined
        };
    }
}