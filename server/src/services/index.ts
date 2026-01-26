/**
 * Exports centralizados de todos los servicios
 * 
 * Estructura:
 * - auth: Servicios de autenticación
 * - user: Servicios de usuario
 * - connection: Servicios de conexión a plataformas
 * - platforms: Servicios específicos de cada plataforma
 * - chat: Providers de chat y transformadores
 * - webhook: Procesadores de webhooks
 * 
 * IMPORTANTE: Cada plataforma tiene servicios separados porque:
 * - Twitch: OAuth + tmi.js
 * - YouTube: OAuth + HTTP polling
 * - Kick: OAuth + HTTP polling + Webhook
 * - TikTok: Username (no OAuth) + WebSocket
 */

// Servicios principales
export { AuthService } from './AuthService';
export { ChatManager } from './ChatManager';

// Servicios de autenticación
export * from './auth/index';

// Servicios de usuario
export * from './user/index';

// Servicios de conexión
export * from './connection/index';

// Servicios de plataformas
export * from './platforms/index';

// Servicios de chat
export * from './chat/index';

// Servicios de webhook
export * from './webhook/index';
