import { Router } from 'express';
import { twitchAuth } from '../controllers/auth.controller';

const router = Router();

// POST /api/auth/twitch
router.post('/twitch', twitchAuth);

export default router;
