/**
 * Transformador de Eventos de TikTok
 * Responsabilidad: Transformar eventos específicos de TikTok a formato normalizado
 */

import { TikTokChatEvent, TikTokGiftEvent, TikTokFollowEvent } from '../../../types/tiktok.types';
import { NormalizedChatMessage } from './EventTransformer';
import { BaseEventTransformer } from './BaseEventTransformer';

interface TikTokUser {
    nickname: string;
    uniqueId: string;
    userId: string;
    profilePicture?: {
        url?: string[];
    };
    profilePictureUrl?: string;
}

interface TikTokInternalEvent {
    user?: TikTokUser;
    nickname?: string;
    uniqueId?: string;
    userId?: string;
    profilePicture?: {
        url?: string[];
    };
    profilePictureUrl?: string;
    common?: {
        msgId?: string;
    };
    gift?: {
        name?: string;
        giftName?: string;
        id?: string;
    };
    name?: string;
    giftName?: string;
    id?: string;
    repeatCount?: number;
}

export class TikTokEventTransformer extends BaseEventTransformer {
    protected readonly platformName = 'tiktok';

    /**
     * Verifica si un nombre tiene suficientes caracteres legibles (no solo emojis)
     * Retorna true si tiene al menos 2 caracteres alfanuméricos
     */
    private hasReadableCharacters(name: string): boolean {
        if (!name) return false;
        // Contar caracteres alfanuméricos (letras y números)
        const alphanumericCount = (name.match(/[a-zA-Z0-9]/g) || []).length;
        return alphanumericCount >= 2;
    }

    /**
     * Selecciona el mejor nombre para mostrar
     * Prioriza nickname si tiene caracteres legibles, sino usa uniqueId
     */
    private selectDisplayName(nickname: string, uniqueId: string): string {
        if (nickname && this.hasReadableCharacters(nickname)) {
            return nickname;
        }
        return uniqueId || nickname || 'Usuario';
    }

    /**
     * Transforma mensaje de chat de TikTok
     * Implementación de la interfaz base
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transformMessage(_data: unknown): NormalizedChatMessage {
        throw new Error('Use transformChatMessage, transformGift, or transformFollow instead');
    }

    /**
     * Transforma evento especial de TikTok
     * Implementación de la interfaz base
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transformSpecialEvent(_data: unknown): NormalizedChatMessage {
        throw new Error('Use transformGift or transformFollow instead');
    }

    /**
     * Transforma mensaje de chat de TikTok (método específico)
     */
    transformChatMessage(data: TikTokChatEvent): NormalizedChatMessage {
        // Manejar estructura nueva (con objeto user anidado) y vieja (propiedades en raíz)
        const eventData = data as unknown as TikTokInternalEvent;
        const userObj = eventData.user || eventData;

        // Seleccionar el mejor nombre (nickname si es legible, sino uniqueId)
        const username = this.selectDisplayName(userObj.nickname || '', userObj.uniqueId || '');
        const userId = userObj.userId || data.userId || 'unknown';
        const avatar = userObj.profilePicture?.url?.[0] || userObj.profilePictureUrl || '';

        return {
            id: eventData.common?.msgId || data.msgId || `tk_chat_${Date.now()}_${userId}`,
            platform: 'tiktok',
            user: username,
            message: data.comment,
            time: this.formatTime(new Date()),
            color: '#FF0050', // Color de marca de TikTok
            avatar: avatar,
            isMod: data.mod,
            isSub: data.subscriber,
            isOwner: data.isOwner
        };
    }

    /**
     * Transforma evento de regalo de TikTok
     */
    transformGift(data: TikTokGiftEvent): NormalizedChatMessage {
        // Manejar estructura nueva (con objeto user anidado) y vieja (propiedades en raíz)
        const eventData = data as unknown as TikTokInternalEvent;
        const userObj = eventData.user || eventData;

        // Seleccionar el mejor nombre (nickname si es legible, sino uniqueId)
        const username = this.selectDisplayName(userObj.nickname || '', userObj.uniqueId || '');
        const userId = userObj.userId || data.userId || 'unknown';
        const avatar = userObj.profilePicture?.url?.[0] || userObj.profilePictureUrl || '';

        // Extraer información del regalo de diferentes estructuras posibles
        const giftInfo = eventData.gift || eventData;
        const giftName = giftInfo.name || giftInfo.giftName || data.giftName || 'Regalo';
        const repeatCount = eventData.repeatCount || data.repeatCount || 1;
        const giftId = `tk_gift_${userId}_${giftInfo.id || data.giftId}_${data.timestamp || Date.now()}`;

        return {
            id: giftId,
            platform: 'tiktok',
            user: username,
            message: '',
            specialMessage: `🎁 REGALO: ${repeatCount}x ${giftName}`,
            time: this.formatTime(new Date()),
            color: '#FF0050', // Color de marca de TikTok
            avatar: avatar,
            isSpecial: true
        };
    }

    /**
     * Transforma evento de seguidor de TikTok
     */
    transformFollow(data: TikTokFollowEvent): NormalizedChatMessage {
        // Manejar estructura nueva (con objeto user anidado) y vieja (propiedades en raíz)
        const eventData = data as unknown as TikTokInternalEvent;
        const userObj = eventData.user || eventData;

        // Seleccionar el mejor nombre (nickname si es legible, sino uniqueId)
        const username = this.selectDisplayName(userObj.nickname || '', userObj.uniqueId || '');
        const userId = userObj.userId || data.userId || 'unknown';
        const avatar = userObj.profilePicture?.url?.[0] || userObj.profilePictureUrl || '';
        const followId = `tk_follow_${userId}_${Date.now()}`;

        return {
            id: followId,
            platform: 'tiktok',
            user: username,
            message: '¡Te ha seguido!',
            specialMessage: '👤 NUEVO SEGUIDOR',
            time: this.formatTime(new Date()),
            color: '#FF0050', // Color de marca de TikTok
            avatar: avatar
        };
    }
}
