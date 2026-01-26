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
}
