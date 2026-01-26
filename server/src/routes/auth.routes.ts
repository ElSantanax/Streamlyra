/**
 * Rutas de Autenticación
 * Responsabilidad: Definir endpoints de autenticación
 * 
 * IMPORTANTE: Cada plataforma tiene requisitos diferentes:
 * - Twitch, YouTube, Kick: OAuth (optionalAuthenticate - permite usuarios nuevos)
 * - TikTok: Username (authenticateToken - requiere usuario autenticado)
 * 
 * La inyección de dependencias ocurre en server.ts
 */

import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken, optionalAuthenticate } from '../middleware/auth.middleware';
import { validateZodBody } from '../middleware/zod.middleware';
import { disconnectPlatformSchema, oauthCodeSchema, tiktokSchema } from '../dtos/auth.dto';
import { logger } from '../utils/logger';

/**
 * Crea las rutas de autenticación
 * @param authController - Controlador de autenticación (inyectado desde server.ts)
 * @returns Router configurado con todas las rutas de auth
 */
export const createAuthRoutes = (authController: AuthController) => {
    const router = Router();

    logger.debug({}, 'Configurando rutas de autenticación');

    /**
     * GET /api/auth/me
     * Obtiene información del usuario autenticado
     * Requiere: Token JWT válido
     */
    router.get('/me', authenticateToken, authController.getMe);

    /**
     * POST /api/auth/twitch
     * Autentica con Twitch usando OAuth
     * Middleware: optionalAuthenticate (permite usuarios nuevos)
     * Body: { code: string }
     */
    router.post('/twitch', optionalAuthenticate, validateZodBody(oauthCodeSchema), authController.twitchAuth);

    /**
     * POST /api/auth/youtube
     * Autentica con YouTube usando OAuth
     * Middleware: optionalAuthenticate (permite usuarios nuevos)
     * Body: { code: string }
     */
    router.post('/youtube', optionalAuthenticate, validateZodBody(oauthCodeSchema), authController.youtubeAuth);

    /**
     * POST /api/auth/kick
     * Autentica con Kick usando OAuth
     * Middleware: optionalAuthenticate (permite usuarios nuevos)
     * Body: { code: string }
     */
    router.post('/kick', optionalAuthenticate, validateZodBody(oauthCodeSchema), authController.kickAuth);

    /**
     * POST /api/auth/tiktok
     * Conecta TikTok usando username
     * Middleware: authenticateToken (requiere usuario autenticado)
     * Body: { username: string }
     * 
     * NOTA: TikTok es diferente porque:
     * - No usa OAuth (usa username)
     * - Requiere usuario autenticado previamente
     * - No permite registro directo
     */
    router.post('/tiktok', authenticateToken, validateZodBody(tiktokSchema), authController.tiktokAuth);

    /**
     * DELETE /api/auth/platform
     * Desconecta una plataforma del usuario
     * Requiere: Token JWT válido
     * Body: { platform: string }
     */
    router.delete('/platform', authenticateToken, validateZodBody(disconnectPlatformSchema), authController.disconnectPlatform);

    return router;
};

export default createAuthRoutes;