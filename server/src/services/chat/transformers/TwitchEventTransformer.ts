/**
 * Transformador de Eventos de Twitch
 * Responsabilidad: Transformar eventos específicos de Twitch a formato normalizado
 */

import { NormalizedChatMessage } from './EventTransformer';
import { BaseEventTransformer } from './BaseEventTransformer';

export class TwitchEventTransformer extends BaseEventTransformer {
    protected readonly platformName = 'twitch';

    /**
     * Transforma mensaje de chat de Twitch
     * Implementación de la interfaz base
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transformMessage(_data: unknown): NormalizedChatMessage {
        // Este método es requerido por la interfaz base
        // pero Twitch usa métodos específicos (transformChatMessage con tags, transformSubscription, etc)
        throw new Error('Use transformChatMessage(tags, message) instead');
    }

    /**
     * Transforma evento especial de Twitch
     * Implementación de la interfaz base
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transformSpecialEvent(_data: unknown): NormalizedChatMessage {
        throw new Error('Use transformSubscription, transformResub, or transformCheer instead');
    }

    /**
     * Transforma mensaje de chat de Twitch (método específico)
     */
    transformChatMessage(tags: Record<string, unknown>, message: string): NormalizedChatMessage {
        return {
            id: (tags.id as string) || Date.now().toString(),
            platform: 'twitch',
            user: (tags['display-name'] as string) || (tags.username as string) || 'Unknown',
            message,
            time: this.formatTime(new Date()),
            color: '#9146FF', // Color morado de Twitch
            isMod: (tags.mod as boolean) || false,
            isSub: (tags.subscriber as boolean) || false,
            isVIP: !!(tags.vip as boolean),
            isOwner: (tags.badges as Record<string, string>)?.broadcaster === '1'
        };
    }

    /**
     * Transforma evento de suscripción de Twitch
     */
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

    /**
     * Transforma evento de re-suscripción de Twitch
     */
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

    /**
     * Transforma evento de cheer (bits) de Twitch
     */
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
