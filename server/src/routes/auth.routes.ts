import { Router } from 'express';
import { ChatManager } from '../services/ChatManager';
import { twitchAuth, youtubeAuth, kickAuth, tiktokAuth, getMe, disconnectPlatform } from '../controllers/auth.controller';
import { authenticateToken, optionalAuthenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { Server } from 'socket.io';

export const createAuthRoutes = (io: Server, chatManager: ChatManager) => {
    const router = Router();

    router.get('/me', authenticateToken, getMe);
    router.post('/twitch', optionalAuthenticate, validateBody(['code']), twitchAuth);
    router.post('/youtube', optionalAuthenticate, validateBody(['code']), youtubeAuth);
    router.post('/kick', optionalAuthenticate, validateBody(['code']), kickAuth);
    router.post('/tiktok', authenticateToken, validateBody(['username']), tiktokAuth(chatManager));
    router.delete('/platform', authenticateToken, validateBody(['provider']), disconnectPlatform(chatManager));

    return router;
};

export default createAuthRoutes;

