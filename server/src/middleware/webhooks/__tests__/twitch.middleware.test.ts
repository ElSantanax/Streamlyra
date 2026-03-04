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
        (TwitchWebhookService.isDuplicate as jest.Mock).mockReturnValue(false);
    });

    afterEach(() => {
        jest.resetAllMocks();
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

    it('debe lanzar error si no se encuentra el broadcaster ID', async () => {
        mockReq.body = { subscription: { condition: {} } };

        await validateTwitchWebhook(mockReq as RequestWithWebhookData, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
        expect(error.message).toBe('Missing broadcaster ID in payload');
        expect(error.statusCode).toBe(400);
    });

    it('debe manejar la revocación de la suscripción', async () => {
        const mockWebhook = { id: 1, broadcasterId: '123', secret: 'secret', update: jest.fn().mockResolvedValue({}) };
        (TwitchWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);
        (TwitchWebhookService.verifySignature as jest.Mock).mockReturnValue(true);
        (mockReq.header as jest.Mock).mockImplementation((name: string) => {
            if (name === 'Twitch-Eventsub-Message-Type') return 'revocation';
            if (name === 'Twitch-Eventsub-Message-Id') return 'msg123';
            if (name === 'Twitch-Eventsub-Message-Timestamp') return new Date().toISOString();
            if (name === 'Twitch-Eventsub-Message-Signature') return 'sig123';
            return undefined;
        });

        await validateTwitchWebhook(mockReq as RequestWithWebhookData, mockRes as Response, mockNext);

        expect(TwitchWebhookService.handleRevocation).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.send).toHaveBeenCalledWith('OK (Revoked)');
    });

    it('debe migrar un secreto no encriptado', async () => {
        const updateMock = jest.fn().mockResolvedValue({});
        const mockWebhook = { id: 1, broadcasterId: '123', secret: 'plain-secret', update: updateMock };
        (TwitchWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);
        (TwitchWebhookService.verifySignature as jest.Mock).mockReturnValue(true);
        (encryptionService.isEncrypted as jest.Mock).mockReturnValue(false);
        (encryptionService.encrypt as jest.Mock).mockReturnValue('encrypted-secret');

        await validateTwitchWebhook(mockReq as RequestWithWebhookData, mockRes as Response, mockNext);

        expect(encryptionService.encrypt).toHaveBeenCalledWith('plain-secret');
        expect(updateMock).toHaveBeenCalledWith({ secret: 'encrypted-secret' });
    });

    it('debe desencriptar un secreto encriptado', async () => {
        const mockWebhook = { id: 1, broadcasterId: '123', secret: 'encrypted-secret', update: jest.fn() };
        (TwitchWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);
        (TwitchWebhookService.verifySignature as jest.Mock).mockReturnValue(true);
        (encryptionService.isEncrypted as jest.Mock).mockReturnValue(true);
        (encryptionService.decrypt as jest.Mock).mockReturnValue('plain-secret');

        await validateTwitchWebhook(mockReq as RequestWithWebhookData, mockRes as Response, mockNext);

        expect(encryptionService.decrypt).toHaveBeenCalledWith('encrypted-secret', 'TwitchWebhook:1 (123)');
        expect(TwitchWebhookService.verifySignature).toHaveBeenCalledWith(
            'plain-secret', expect.any(String), expect.any(String), expect.any(String), expect.any(String)
        );
    });

    it('debe usar headers adicionales para la búsqueda en DB', async () => {
        const mockWebhook = { id: 1, broadcasterId: '123', secret: 'secret', update: jest.fn().mockResolvedValue({}) };
        (TwitchWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);
        (TwitchWebhookService.verifySignature as jest.Mock).mockReturnValue(true);

        (mockReq.header as jest.Mock).mockImplementation((name: string) => {
            if (name === 'Twitch-Eventsub-Message-Id') return 'msg123';
            if (name === 'Twitch-Eventsub-Message-Timestamp') return new Date().toISOString();
            if (name === 'Twitch-Eventsub-Message-Signature') return 'sig123';
            if (name === 'Twitch-Eventsub-Message-Type') return 'notification';
            if (name === 'Twitch-Eventsub-Subscription-Id') return 'header-sub123';
            if (name === 'Twitch-Eventsub-Subscription-Type') return 'channel.raid';
            return undefined;
        });

        await validateTwitchWebhook(mockReq as RequestWithWebhookData, mockRes as Response, mockNext);

        expect(TwitchWebhook.findOne).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.any(Object),
            order: [['createdAt', 'DESC']]
        }));
    });

    it('debe usar el body como rawBody si este último falta', async () => {
        const mockWebhook = { id: 1, broadcasterId: '123', secret: 'secret', update: jest.fn().mockResolvedValue({}) };
        (TwitchWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);
        (TwitchWebhookService.verifySignature as jest.Mock).mockReturnValue(true);
        mockReq.rawBody = undefined;

        await validateTwitchWebhook(mockReq as RequestWithWebhookData, mockRes as Response, mockNext);

        expect(TwitchWebhookService.verifySignature).toHaveBeenCalledWith(
            expect.any(String), expect.any(String), expect.any(String), JSON.stringify(mockReq.body), expect.any(String)
        );
    });

    it('debe registrar y lanzar error 500 para errores fatales', async () => {
        (TwitchWebhook.findOne as jest.Mock).mockRejectedValue(new Error('DB failure'));

        await validateTwitchWebhook(mockReq as RequestWithWebhookData, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
        expect(error.statusCode).toBe(500);
        expect(error.message).toBe('Twitch validation failed');
    });
});
