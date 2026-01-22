import { Router } from 'express';
import { twitchAuth, youtubeAuth, getMe, disconnectPlatform, devLogin } from '../controllers/auth.controller';
import { authenticateToken, optionalAuthenticate } from '../middleware/auth.middleware';

const router = Router();

// GET /api/auth/me - Requiere estar logueado
router.get('/me', authenticateToken, getMe);

// POST /api/auth/twitch - Autenticación opcional para permitir vinculación
router.post('/twitch', optionalAuthenticate, twitchAuth);

// POST /api/auth/youtube - Autenticación opcional para permitir vinculación
router.post('/youtube', optionalAuthenticate, youtubeAuth);

// DELETE /api/auth/platform - Requiere estar logueado
router.delete('/platform', authenticateToken, disconnectPlatform);

// Auth de desarrollo
router.post('/dev-login', devLogin);

export default router;
