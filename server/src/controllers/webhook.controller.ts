import { Request, Response } from 'express';
import { KickWebhookService } from '../services/chat/KickWebhookService';
import { io } from '../server';
import { KickChatMessagePayload } from '../types/kick.types';

interface RequestWithRawBody extends Request {
    rawBody?: string;
}

export const handleKickWebhook = async (req: RequestWithRawBody, res: Response): Promise<void> => {
    const signature =
        req.header('Kick-Event-Signature') ||
        req.header('X-Kick-Signature') ||
        '';
    const timestamp =
        req.header('Kick-Event-Message-Timestamp') ||
        req.header('X-Kick-Timestamp') ||
        '';
    const messageId =
        req.header('Kick-Event-Message-Id') ||
        req.header('X-Kick-Event-Message-Id') ||
        '';
    const eventType =
        req.header('Kick-Event-Type') ||
        req.header('X-Kick-Event-Type') ||
        '';

    if (!signature || !timestamp || !messageId) {
        res.status(400).send('Missing signature, timestamp, or message id');
        return;
    }

    const rawBody = req.rawBody || JSON.stringify(req.body);

    // Use config instead of direct process.env
    const skipSignature = process.env.KICK_WEBHOOK_SKIP_SIGNATURE === 'true';
    const isValid = skipSignature ? true : await KickWebhookService.verifySignature(signature, messageId, timestamp, rawBody);

    if (!isValid) {
        console.warn('[KickWebhook] Firma inválida recibida');
        res.status(401).send('Invalid signature');
        return;
    }

    res.status(200).send('OK');

    if (eventType === 'chat.message.sent') {
        void KickWebhookService.handleChatEvent(req.body as KickChatMessagePayload, io);
    } else {
        console.log(`[KickWebhook] Evento recibido: ${eventType}`);
    }
};
