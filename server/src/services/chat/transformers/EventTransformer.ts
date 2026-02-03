/**
 * Interfaz base para transformadores de eventos
 * Cada plataforma implementa esta interfaz para transformar sus eventos
 */

export interface NormalizedChatMessage {
    id: string;
    platform: 'twitch' | 'youtube' | 'kick' | 'tiktok';
    user: string;
    message: string;
    specialMessage?: string;
    time: string;
    color?: string;
    avatar?: string;
    isMod?: boolean;
    isSub?: boolean;
    isVIP?: boolean;
    isOwner?: boolean;
    isSpecial?: boolean;
    // Campos adicionales para moderación (específicos de plataforma)
    messageId?: string; // ID único del mensaje para eliminar (UUID en Twitch)
    userId?: string; // ID del usuario que envió el mensaje
    roomId?: string; // ID del canal/room (broadcaster_id en Twitch)
    // Emotes para renderizado visual
    emotes?: Array<{
        id: string;
        name: string;
        url: string;
        positions: Array<[number, number]>; // [inicio, fin] en el texto original
    }>;
}
