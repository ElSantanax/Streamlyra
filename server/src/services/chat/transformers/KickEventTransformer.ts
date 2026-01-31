/**
 * Transformador de Eventos de Kick
 * Responsabilidad: Transformar eventos específicos de Kick a formato normalizado
 */

import { KickChatMessagePayload } from '../../../types/kick.types';
import { NormalizedChatMessage } from './EventTransformer';
import { BaseEventTransformer } from './BaseEventTransformer';

export class KickEventTransformer extends BaseEventTransformer {
    protected readonly platformName = 'kick';
    /**
     * Transforma mensaje de chat de Kick
     */
    transformMessage(payload: KickChatMessagePayload): NormalizedChatMessage {
        const { broadcaster, sender, content, message_id, created_at } = payload;

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
            roomId: broadcaster?.user_id?.toString() || ''
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transformSpecialEvent(_data: unknown): NormalizedChatMessage {
        throw new Error('Method not implemented.');
    }
}
