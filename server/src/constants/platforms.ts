/**
 * Constantes de plataformas
 * Fuente única de verdad para nombres y tipos de plataformas
 */

export const PLATFORMS = ['twitch', 'youtube', 'kick', 'tiktok'] as const;

export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_NAMES: Record<Platform, string> = {
    twitch: 'Twitch',
    youtube: 'YouTube',
    kick: 'Kick',
    tiktok: 'TikTok'
};

export const PLATFORM_COLORS: Record<Platform, string> = {
    twitch: '#9146FF',
    youtube: '#FF0000',
    kick: '#10A652',
    tiktok: '#000000'
};

export const OAUTH_PLATFORMS = ['twitch', 'youtube', 'kick'] as const;

export type OAuthPlatform = (typeof OAUTH_PLATFORMS)[number];

export const NON_OAUTH_PLATFORMS = ['tiktok'] as const;

export type NonOAuthPlatform = (typeof NON_OAUTH_PLATFORMS)[number];
