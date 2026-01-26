/**
 * Exports de Socket.io
 * 
 * Responsabilidad: Manejar conexiones de clientes y orquestar conexiones a plataformas
 * 
 * IMPORTANTE: Socket.io es el intermediario que conecta:
 * - Twitch: tmi.js
 * - YouTube: HTTP polling
 * - Kick: HTTP polling + Webhook
 * - TikTok: WebSocket
 */

export { setupSocketHandlers } from './socket.handler';
export { SocketConnectionManager } from './SocketConnectionManager';
