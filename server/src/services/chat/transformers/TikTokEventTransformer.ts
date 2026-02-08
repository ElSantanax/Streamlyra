/**
 * Transformador de Eventos de TikTok
 * Responsabilidad: Transformar eventos específicos de TikTok a formato normalizado
 */

import { TikTokChatEvent, TikTokGiftEvent, TikTokFollowEvent } from '../../../types/tiktok.types';
import { NormalizedChatMessage } from './EventTransformer';
import { BaseEventTransformer } from './BaseEventTransformer';
import { parseTikTokEmotes } from '../../../constants/tiktok-emotes';

interface TikTokUser {
    nickname: string;
    uniqueId: string;
    userId: string;
}

interface TikTokInternalEvent {
    user?: TikTokUser;
    nickname?: string;
    uniqueId?: string;
    userId?: string;
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
        // Manejar estructura nueva (con objeto user anidado) y vieja (propiedades en raíz)
        const eventData = data as unknown as TikTokInternalEvent;
        const userObj = eventData.user || eventData;

        // Seleccionar el mejor nombre (nickname si es legible, sino uniqueId)
        const username = this.selectDisplayName(userObj.nickname || '', userObj.uniqueId || '');
        const userId = userObj.userId || data.userId || 'unknown';

        // Obtener el mensaje original
        let message = data.comment || '';

        // Parsear emotes nativos de TikTok del mensaje
        const parsedNativeEmotes = parseTikTokEmotes(message);

        // Parsear emotes personalizados de TikTok (stickers subidos por usuarios)
        const parsedCustomEmotes = this.parseEmotes(data.emotes, message);

        // Combinar emotes nativos y personalizados
        const allEmotes = [...parsedNativeEmotes, ...parsedCustomEmotes];

        // Si el comentario está vacío pero hay emotes/stickers personalizados, poner un emoji de fallback
        if (!message || message.trim() === '') {
            if (data.emotes && data.emotes.length > 0) {
                message = '☺️'; // Emoji predeterminado para stickers personalizados
            }
        }

        return {
            id: eventData.common?.msgId || data.msgId || `tk_chat_${Date.now()}_${userId}`,
            platform: 'tiktok',
            user: username,
            message: message || '',
            time: this.formatTime(new Date()),
            color: '#FF0050', // Color de marca de TikTok
            isMod: data.mod,
            isSub: data.subscriber,
            isOwner: data.isOwner,
            emotes: allEmotes.length > 0 ? allEmotes : undefined
        };
    }

    /**
     * Parsea los emotes de TikTok desde el evento
     * Formato: [{ emoteId: string, image: { url_list: string[] } }]
     */
    private parseEmotes(emotesData: Array<{ emoteId: string; image: { url_list: string[] } }> | undefined, message: string): Array<{
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

        // TikTok no proporciona posiciones exactas, así que usamos el mensaje completo
        // Si el mensaje está vacío o es solo el emoji de fallback, el emote ocupa todo
        const isEmoteOnly = !message || message.trim() === '' || message === '☺️';

        for (const emote of emotesData) {
            // Usar la primera URL disponible de la lista
            const emoteUrl = emote.image?.url_list?.[0];

            if (emoteUrl) {
                emotes.push({
                    id: emote.emoteId,
                    name: emote.emoteId, // TikTok no proporciona nombre, usamos el ID
                    url: emoteUrl,
                    positions: isEmoteOnly ? [[0, message.length - 1]] : [] // Posición completa si es solo emote
                });
            }
        }

        return emotes;
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
        const followKey = userId !== 'unknown' ? userId : (userObj.uniqueId || data.uniqueId || 'unknown');
        const followId = `tk_follow_${followKey}`;

        return {
            id: followId,
            platform: 'tiktok',
            user: username,
            message: '',
            specialMessage: '👤 NUEVO SEGUIDOR',
            time: this.formatTime(new Date()),
            color: '#FF0050' // Color de marca de TikTok
        };
    }
}
