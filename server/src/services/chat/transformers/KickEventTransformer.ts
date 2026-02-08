/**
 * Transformador de Eventos de Kick
 * Responsabilidad: Transformar eventos específicos de Kick a formato normalizado
 */

import { KickChatMessagePayload, KickGiftEvent, KickSubscriptionEvent, KickFollowEvent } from '../../../types/kick.types';
import { NormalizedChatMessage } from './EventTransformer';
import { BaseEventTransformer } from './BaseEventTransformer';

export class KickEventTransformer extends BaseEventTransformer {
    protected readonly platformName = 'kick';
    /**
     * Transforma mensaje de chat de Kick
     */
    transformMessage(payload: KickChatMessagePayload): NormalizedChatMessage {
        const { broadcaster, sender, content, message_id, created_at, emotes } = payload;

        const parsedEmotes = this.parseEmotes(emotes, content);

        return {
            id: message_id || '',
            platform: 'kick',
            user: sender?.username || 'Sistema',
            message: content || '',
            time: this.formatTime(new Date(created_at || Date.now())),
            color: '#53fc18', // Color verde de Kick
            isMod: sender?.identity?.badges?.some((b) => b.type === 'moderator') || false,
            isSub: sender?.identity?.badges?.some((b) => b.type === 'subscriber') || false,
            isVIP: sender?.is_verified || false,
            isOwner: broadcaster?.user_id === sender?.user_id,
            // Campos para moderación
            messageId: message_id || '',
            userId: sender?.user_id?.toString() || '',
            roomId: broadcaster?.user_id?.toString() || '',
            emotes: parsedEmotes.length > 0 ? parsedEmotes : undefined
        };
    }

    /**
     * Parsea los emotes de Kick desde el payload
     * Formato: [{ emote_id: string, positions: [{ s: number, e: number }] }]
     */
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

                    // Extraer el nombre del emote del mensaje (solo una vez)
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
        const { username, created_at } = event;

        return {
            id: `kick-follow-${Date.now()}`,
            platform: 'kick',
            user: username,
            message: '',
            specialMessage: '👤 NUEVO SEGUIDOR',
            time: this.formatTime(new Date(created_at || Date.now())),
            color: '#53fc18'
        };
    }

     
    transformSpecialEvent(_data: unknown): NormalizedChatMessage {
        throw new Error('Method not implemented.');
    }
}
