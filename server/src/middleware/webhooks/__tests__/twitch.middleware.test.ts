import { validateTwitchWebhook } from '../twitch.middleware';
import { Response, NextFunction } from 'express';
import { TwitchWebhookService } from '../../../services/chat/twitch/TwitchWebhookService';
import { TwitchWebhook } from '../../../models/TwitchWebhook.model';
import { encryptionService } from '../../../services/security/EncryptionService';
import { AppError } from '../../../utils/AppError';
import { RequestWithWebhookData } from '../utils';

jest.mock('../../../services/chat/twitch/TwitchWebhookService');
jest.mock('../../../models/TwitchWebhook.model');
jest.mock('../../../services/security/EncryptionService');
jest.mock('../../../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
    },
}));

describe('Twitch Webhook Middleware', () => {
    let mockReq: Partial<RequestWithWebhookData>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockReq = {
            header: jest.fn(),
            body: {
                subscription: {
                    condition: { broadcaster_user_id: '123' },
                    type: 'channel.follow',
                    id: 'sub123'
                }
            },
            rawBody: '{"test":"data"}',
            path: '/webhooks/twitch'
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };
        mockNext = jest.fn();

        (mockReq.header as jest.Mock).mockImplementation((name: string) => {
            if (name === 'Twitch-Eventsub-Message-Id') return 'msg123';
            if (name === 'Twitch-Eventsub-Message-Timestamp') return new Date().toISOString();
            if (name === 'Twitch-Eventsub-Message-Signature') return 'sig123';
            if (name === 'Twitch-Eventsub-Message-Type') return 'notification';
            return undefined;
        });

        (encryptionService.isEncrypted as jest.Mock).mockReturnValue(false);
        (encryptionService.encrypt as jest.Mock).mockReturnValue('encrypted-secret');
        (encryptionService.decrypt as jest.Mock).mockReturnValue('plain-secret');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe lanzar error si faltan headers requeridos', async () => {
        (mockReq.header as jest.Mock).mockReturnValue(undefined);

        await validateTwitchWebhook(mockReq as RequestWithWebhookData, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
        expect(error.message).toBe('Missing required Twitch headers');
    });

    it('debe lanzar error si el webhook no está registrado en la DB', async () => {
        (TwitchWebhook.findOne as jest.Mock).mockResolvedValue(null);

        await validateTwitchWebhook(mockReq as RequestWithWebhookData, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
        expect(error.statusCode).toBe(404);
    });

    it('debe manejar la verificación del callback (challenge)', async () => {
        const mockWebhook = { id: 1, broadcasterId: '123', secret: 'secret', update: jest.fn().mockResolvedValue({}) };
        (TwitchWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);
        (TwitchWebhookService.verifySignature as jest.Mock).mockReturnValue(true);
        (mockReq.header as jest.Mock).mockImplementation((name: string) => {
            if (name === 'Twitch-Eventsub-Message-Type') return 'webhook_callback_verification';
            if (name === 'Twitch-Eventsub-Message-Id') return 'msg123';
            if (name === 'Twitch-Eventsub-Message-Timestamp') return new Date().toISOString();
            if (name === 'Twitch-Eventsub-Message-Signature') return 'sig123';
            return undefined;
        });
        mockReq.body.challenge = 'twitch-challenge-123';

        await validateTwitchWebhook(mockReq as RequestWithWebhookData, mockRes as Response, mockNext);

        expect(TwitchWebhookService.handleVerification).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.send).toHaveBeenCalledWith('twitch-challenge-123');
    });

    it('debe abortar si la firma es inválida', async () => {
        const mockWebhook = { id: 1, broadcasterId: '123', secret: 'secret', update: jest.fn().mockResolvedValue({}) };
        (TwitchWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);
        (TwitchWebhookService.verifySignature as jest.Mock).mockReturnValue(false);

        await validateTwitchWebhook(mockReq as RequestWithWebhookData, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
        expect(error.statusCode).toBe(401);
    });

    it('debe llamar a next() si todo es correcto', async () => {
        const mockWebhook = { id: 1, broadcasterId: '123', secret: 'secret', update: jest.fn().mockResolvedValue({}) };
        (TwitchWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);
        (TwitchWebhookService.verifySignature as jest.Mock).mockReturnValue(true);
        (TwitchWebhookService.isDuplicate as jest.Mock).mockReturnValue(false);

        await validateTwitchWebhook(mockReq as RequestWithWebhookData, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockReq.webhookData).toBeDefined();
    });

    it('debe manejar duplicados retornando 200 OK', async () => {
        const mockWebhook = { id: 1, broadcasterId: '123', secret: 'secret', update: jest.fn().mockResolvedValue({}) };
        (TwitchWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);
        (TwitchWebhookService.verifySignature as jest.Mock).mockReturnValue(true);
        (TwitchWebhookService.isDuplicate as jest.Mock).mockReturnValue(true);

        await validateTwitchWebhook(mockReq as RequestWithWebhookData, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.send).toHaveBeenCalledWith('OK (Duplicate)');
        expect(mockNext).not.toHaveBeenCalled();
    });
});
