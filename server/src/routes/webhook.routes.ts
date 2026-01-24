import { Router, Request } from 'express';
import { KickWebhookService } from '../services/chat/KickWebhookService';
import { io } from '../server';
import colors from 'colors';
import { KickChatMessagePayload } from '../types/kick.types';

interface RequestWithRawBody extends Request {
    rawBody?: string;
}

const router = Router();

// Kick envía Webhooks por POST
router.post('/kick', async (req: RequestWithRawBody, res) => {
    // Headers oficiales (docs.kick.com/events/webhook-security)
    // Express hace header lookup case-insensitive con req.header(...)
    const signature =
        req.header('Kick-Event-Signature') ||
        req.header('X-Kick-Signature') || // compat
        '';
    const timestamp =
        req.header('Kick-Event-Message-Timestamp') ||
        req.header('X-Kick-Timestamp') || // compat
        '';
    const messageId =
        req.header('Kick-Event-Message-Id') ||
        req.header('X-Kick-Event-Message-Id') || // compat
        '';
    const eventType =
        req.header('Kick-Event-Type') ||
        req.header('X-Kick-Event-Type') || // compat
        '';

    if (!signature || !timestamp || !messageId) {
        return res.status(400).send('Missing signature, timestamp, or message id');
    }

    // El body debe ser el raw body para la verificación de firma
    const rawBody = req.rawBody || JSON.stringify(req.body);

    // Permite testear localmente (NO usar en prod)
    const skipSignature = process.env.KICK_WEBHOOK_SKIP_SIGNATURE === 'true';
    const isValid = skipSignature ? true : await KickWebhookService.verifySignature(signature, messageId, timestamp, rawBody);

    if (!isValid) {
        console.warn(colors.yellow('[KickWebhook] Firma inválida recibida'));
        return res.status(401).send('Invalid signature');
    }

    // Responder rápido a Kick (200 OK)
    res.status(200).send('OK');

    // Procesar el evento de forma asíncrona
    if (eventType === 'chat.message.sent') {
        void KickWebhookService.handleChatEvent(req.body as KickChatMessagePayload, io);
    } else {
        console.log(`[KickWebhook] Evento recibido: ${eventType}`);
    }
});

export default router;
