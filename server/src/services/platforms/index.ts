/**
 * Exports de servicios de plataformas
 * 
 * IMPORTANTE: Cada plataforma tiene su propio servicio porque:
 * - Twitch: Usa OAuth + tmi.js
 * - YouTube: Usa OAuth + HTTP API
 * - Kick: Usa OAuth + HTTP API + Webhook
 * - TikTok: Usa username (no OAuth)
 * 
 * Responsabilidad: Manejar autenticación y APIs específicas de cada plataforma
 */

export { TwitchService } from './TwitchService';
export { YouTubeService } from './YouTubeService';
export { KickService } from './KickService';
export { PlatformServiceFactory } from './PlatformServiceFactory';
