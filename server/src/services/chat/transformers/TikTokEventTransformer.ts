/**
 * Transformador de Eventos de TikTok
 * Responsabilidad: Transformar eventos específicos de TikTok a formato normalizado
 */

import { TikTokChatEvent, TikTokGiftEvent, TikTokFollowEvent } from '../../../types/tiktok.types';
import { NormalizedChatMessage } from './EventTransformer';
import { BaseEventTransformer } from './BaseEventTransformer';

export class TikTokEventTransformer extends BaseEventTransformer {
    protected readonly platformName = 'tiktok';

    /**
     * Transforma mensaje de chat de TikTok
     * Implementación de la interfaz base
     */
    transformMessage(_data: unknown): NormalizedChatMessage {
        throw new Error('Use transformChatMessage, transformGift, or transformFollow instead');
    }

    /**
     * Transforma evento especial de TikTok
     * Implementación de la interfaz base
     */
    transformSpecialEvent(_data: unknown): NormalizedChatMessage {
        throw new Error('Use transformGift or transformFollow instead');
    }

    /**
     * Transforma mensaje de chat de TikTok (método específico)
     */
    transformChatMessage(data: TikTokChatEvent): NormalizedChatMessage {
        return {
            id: data.msgId || `tk_chat_${Date.now()}_${data.userId}`,
            platform: 'tiktok',
            user: data.uniqueId,
            message: data.comment,
            time: this.formatTime(new Date()),
            avatar: data.profilePictureUrl,
            isMod: data.mod,
            isSub: data.subscriber,
            isOwner: data.isOwner
        };
    }

    /**
     * Transforma evento de regalo de TikTok
     */
    transformGift(data: TikTokGiftEvent): NormalizedChatMessage {
        const giftId = `tk_gift_${data.userId}_${data.giftId}_${data.timestamp || Date.now()}`;

        return {
            id: giftId,
            platform: 'tiktok',
            user: data.uniqueId,
            message: '',
            specialMessage: `🎁 REGALO: ${data.repeatCount}x ${data.giftName}`,
            time: this.formatTime(new Date()),
            avatar: data.profilePictureUrl,
            isSpecial: true
        };
    }

    /**
     * Transforma evento de seguidor de TikTok
     */
    transformFollow(data: TikTokFollowEvent): NormalizedChatMessage {
        const followId = `tk_follow_${data.userId}_${Date.now()}`;

        return {
            id: followId,
            platform: 'tiktok',
            user: data.uniqueId,
            message: '¡Te ha seguido!',
            specialMessage: '👤 NUEVO SEGUIDOR',
            time: this.formatTime(new Date()),
            avatar: data.profilePictureUrl
        };
    }
}
