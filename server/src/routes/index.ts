/**
 * Exports centralizados de todas las rutas
 * 
 * Responsabilidad: Definir endpoints
 * - createAuthRoutes: Rutas de autenticación
 * - createWebhookRoutes: Rutas de webhooks
 * 
 * IMPORTANTE: Cada plataforma tiene su propia ruta porque:
 * - Twitch, YouTube, Kick: OAuth (optionalAuthenticate)
 * - TikTok: Username (authenticateToken)
 * - Webhooks: Validación específica por plataforma
 */

export { createAuthRoutes, default as authRoutes } from './auth.routes';
export { createWebhookRoutes, default as webhookRoutes } from './webhook.routes';
