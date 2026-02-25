/**
 * Rutas de Autenticación - Define endpoints de autenticación
 */

import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken, optionalAuthenticate } from '../middleware/auth.middleware';
import { validateZodBody } from '../middleware/zod.middleware';
import { disconnectPlatformSchema, oauthCodeSchema, tiktokSchema } from '../dtos/auth.dto';
import { logger } from '../utils/logger';
import { authLimiter } from '../middleware/rateLimit.middleware';

export const createAuthRoutes = (authController: AuthController) => {
    const router = Router();

    logger.debug({}, 'Configurando rutas de autenticación');

    router.get('/me', authenticateToken, authController.getMe);

    router.post('/twitch', authLimiter, optionalAuthenticate, validateZodBody(oauthCodeSchema), authController.twitchAuth);

    router.post('/youtube', authLimiter, optionalAuthenticate, validateZodBody(oauthCodeSchema), authController.youtubeAuth);

    router.post('/kick', authLimiter, optionalAuthenticate, validateZodBody(oauthCodeSchema), authController.kickAuth);

    router.post('/tiktok', authLimiter, authenticateToken, validateZodBody(tiktokSchema), authController.tiktokAuth);

    router.delete('/platform', authenticateToken, validateZodBody(disconnectPlatformSchema), authController.disconnectPlatform);

    router.post('/logout', authenticateToken, authController.logout);

    router.post('/overlay-token/regenerate', authenticateToken, authController.regenerateOverlayToken);

    return router;
};

export default createAuthRoutes;