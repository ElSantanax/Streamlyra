import { KickChatMessagePayload, KickGiftEvent, KickSubscriptionEvent, KickFollowEvent, KickRewardRedemptionEvent } from '../../../types/kick.types';
import { NormalizedChatMessage } from './EventTransformer';
import { BaseEventTransformer } from './BaseEventTransformer';

export class KickEventTransformer extends BaseEventTransformer {
    protected readonly platformName = 'kick';

    transformMessage(payload: KickChatMessagePayload): NormalizedChatMessage {
        const { broadcaster, sender, content, message_id, created_at, emotes } = payload;

        const parsedEmotes = this.parseEmotes(emotes, content);

        return {
            id: message_id || '',
            platform: 'kick',
            user: sender?.username || 'Sistema',
            message: content || '',
            time: this.formatTime(new Date(created_at || Date.now())),
            color: '#53fc18',
            isMod: sender?.identity?.badges?.some((b) => b.type === 'moderator') || false,
            isSub: sender?.identity?.badges?.some((b) => b.type === 'subscriber') || false,
            isVIP: sender?.identity?.badges?.some((b) => b.type === 'vip') || false,
            isOwner: broadcaster?.user_id === sender?.user_id,
            messageId: message_id || '',
            userId: sender?.user_id?.toString() || '',
            roomId: broadcaster?.user_id?.toString() || '',
            emotes: parsedEmotes.length > 0 ? parsedEmotes : undefined
        };
    }

    private parseEmotes(emotesData: Array<{ emote_id: string; positions: Array<{ s: number; e: number }> }> | undefined, message: string): Array<{
        id: string;
        name: string;
        url: string;
        positions: Array<[number, number]>;
    }> {
        if (!emotesData || emotesData.length === 0) {
            return [];
        }

        const emotes: Array<{
            id: string;
            name: string;
            url: string;
            positions: Array<[number, number]>;
        }> = [];

        for (const emote of emotesData) {
            const parsedPositions: Array<[number, number]> = [];
            let emoteName = '';

            for (const pos of emote.positions) {
                const start = pos.s;
                const end = pos.e;

                if (start !== undefined && end !== undefined) {
                    parsedPositions.push([start, end]);

                    if (!emoteName && message) {
                        emoteName = message.substring(start, end + 1);
                    }
                }
            }

            if (parsedPositions.length > 0) {
                emotes.push({
                    id: emote.emote_id,
                    name: emoteName,
                    url: `https://files.kick.com/emotes/${emote.emote_id}/fullsize`,
                    positions: parsedPositions
                });
            }
        }

        return emotes;
    }

    transformSubscription(event: KickSubscriptionEvent): NormalizedChatMessage {
        const { subscriber, duration, created_at } = event;
        const isRenewal = duration > 1;

        return {
            id: `kick-sub-${Date.now()}`,
            platform: 'kick',
            user: subscriber.username,
            message: '',
            specialMessage: isRenewal
                ? `¡RENOVÓ SU SUSCRIPCIÓN POR ${duration} MESES! 🔥`
                : '¡NUEVA SUSCRIPCIÓN! 🥳',
            time: this.formatTime(new Date(created_at || Date.now())),
            color: '#53fc18',
            isSub: true,
            isVIP: true
        };
    }

    transformGift(event: KickGiftEvent): NormalizedChatMessage {
        const { gifter, giftees, created_at } = event;
        const count = giftees.length;

        return {
            id: `kick-gift-${Date.now()}`,
            platform: 'kick',
            user: gifter.username,
            message: '',
            specialMessage: `¡REGALÓ ${count} ${count === 1 ? 'SUSCRIPCIÓN' : 'SUSCRIPCIONES'} A LA COMUNIDAD! 🎁`,
            time: this.formatTime(new Date(created_at || Date.now())),
            color: '#53fc18',
            isSub: true,
            isVIP: true
        };
    }

    transformFollow(event: KickFollowEvent): NormalizedChatMessage {
        const { follower, created_at } = event;

        return {
            id: `kick-follow-${Date.now()}`,
            platform: 'kick',
            user: follower.username,
            message: '',
            specialMessage: '👤 NUEVO SEGUIDOR',
            time: this.formatTime(new Date(created_at || Date.now())),
            color: '#53fc18',
            isSpecial: true
        };
    }

    transformSpecialEvent(_data: unknown): NormalizedChatMessage {
        throw new Error('Method not implemented.');
    }

    transformRewardRedemption(event: KickRewardRedemptionEvent): NormalizedChatMessage {
        const reward = event.reward;
        const redeemer = event.redeemer;
        const userInput = event.user_input?.trim() ? ` → "${event.user_input.trim()}"` : '';
        const points = reward.cost ? ` (${reward.cost.toLocaleString()} puntos)` : '';

        return {
            id: `kick-redemption-${event.id || Date.now()}`,
            platform: 'kick',
            user: redeemer.username,
            message: '',
            specialMessage: `🎁 CANJEÓ "${reward.title}"${points}${userInput}`,
            time: this.formatTime(new Date()),
            color: '#53fc18',
            isSpecial: true
        };
    }
}