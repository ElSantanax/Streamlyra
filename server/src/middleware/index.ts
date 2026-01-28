/**
 * Exports centralizados de todos los middlewares
 * 
 * Responsabilidad: Validación, autenticación, transformación
 * - auth.middleware: Autenticación JWT
 * - webhook.middleware: Validación de webhooks
 * - error.middleware: Manejo de errores
 * - zod.middleware: Validación de datos
 * 
 * IMPORTANTE: Cada plataforma tiene su propio middleware de webhook porque:
 * - Kick: RSA-SHA256
 * - YouTube: Placeholder (futuro)
 * - Twitch: Placeholder (futuro - HMAC-SHA256)
 */

export { authenticateToken, optionalAuthenticate, AuthRequest } from './auth.middleware';
export { validateKickWebhook } from './webhook.middleware';
export { errorHandler } from './error.middleware';
export { validateZodBody } from './zod.middleware';
