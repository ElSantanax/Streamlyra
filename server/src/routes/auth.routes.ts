import { Router } from 'express';
import { twitchAuth, devLogin } from '../controllers/auth.controller';

const router = Router();

// POST /api/auth/twitch
router.post('/twitch', twitchAuth);
router.post('/dev-login', devLogin);

export default router;
