import { Router } from 'express';
import { twitchAuth, youtubeAuth, kickAuth, getMe, disconnectPlatform } from '../controllers/auth.controller';
import { authenticateToken, optionalAuthenticate } from '../middleware/auth.middleware';

const router = Router();

// GET /api/auth/me - Requiere estar logueado
router.get('/me', authenticateToken, getMe);

// POST /api/auth/twitch - Autenticación opcional para permitir vinculación
router.post('/twitch', optionalAuthenticate, twitchAuth);

// POST /api/auth/youtube - Autenticación opcional para permitir vinculación
router.post('/youtube', optionalAuthenticate, youtubeAuth);

// POST /api/auth/kick - Autenticación opcional para permitir vinculación
router.post('/kick', optionalAuthenticate, kickAuth);

// DELETE /api/auth/platform - Requiere estar logueado
router.delete('/platform', authenticateToken, disconnectPlatform);

export default router;
