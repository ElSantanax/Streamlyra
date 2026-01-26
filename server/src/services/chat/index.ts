/**
 * Exports de servicios de chat
 * 
 * IMPORTANTE: Cada plataforma tiene su propio provider porque:
 * - Twitch: Usa tmi.js (biblioteca externa)
 * - YouTube: Usa HTTP polling
 * - Kick: Usa HTTP polling + Webhook
 * - TikTok: Usa WebSocket (tiktok-live-connector)
 * 
 * Responsabilidad: Conectar a chat de cada plataforma y emitir eventos
 */

export { ChatProvider } from './ChatProvider';
export { TwitchChatProvider } from './TwitchChatProvider';
export { YouTubeChatProvider } from './YouTubeChatProvider';
export { KickChatProvider } from './KickChatProvider';
export { TikTokChatProvider } from './TikTokChatProvider';
export { KickWebhookService } from './KickWebhookService';
export { PollingManager } from './PollingManager';
export * from './transformers';
