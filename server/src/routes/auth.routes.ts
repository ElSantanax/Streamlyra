import { Router } from 'express';
import { ChatManager } from '../services/ChatManager';
import { twitchAuth, youtubeAuth, kickAuth, tiktokAuth, getMe, disconnectPlatform } from '../controllers/auth.controller';
import { authenticateToken, optionalAuthenticate } from '../middleware/auth.middleware';
import { Server } from 'socket.io';
import { asyncHandler } from '../utils/asyncHandler';
import { validateZodBody } from '../middleware/zod.middleware';
import { disconnectPlatformSchema, oauthCodeSchema, tiktokSchema } from '../dtos/auth.dto';

export const createAuthRoutes = (io: Server, chatManager: ChatManager) => {
    const router = Router();

    router.get('/me', authenticateToken, asyncHandler(getMe));
    router.post('/twitch', optionalAuthenticate, validateZodBody(oauthCodeSchema), twitchAuth);
    router.post('/youtube', optionalAuthenticate, validateZodBody(oauthCodeSchema), youtubeAuth);
    router.post('/kick', optionalAuthenticate, validateZodBody(oauthCodeSchema), kickAuth);
    router.post('/tiktok', authenticateToken, validateZodBody(tiktokSchema), tiktokAuth(chatManager));
    router.delete('/platform', authenticateToken, validateZodBody(disconnectPlatformSchema), disconnectPlatform(chatManager));

    return router;
};

export default createAuthRoutes;
