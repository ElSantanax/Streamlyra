import { Router } from 'express';
import { handleKickWebhook } from '../controllers/webhook.controller';

const router = Router();

router.post('/kick', handleKickWebhook);

export default router;
