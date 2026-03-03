import { validateKickWebhook } from '../kick.middleware';
import { Response, NextFunction } from 'express';
import { KickWebhookService } from '../../../services/chat/kick/KickWebhookService';
import { AppError } from '../../../utils/AppError';
import { RequestWithWebhookData } from '../utils';

jest.mock('../../../services/chat/kick/KickWebhookService');
jest.mock('../../../config', () => ({
    config: {
        skipKickSignatureVerification: false
    }
}));
jest.mock('../../../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
    },
}));

describe('Kick Webhook Middleware', () => {
    let mockReq: Partial<RequestWithWebhookData>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockReq = {
            header: jest.fn(),
            body: {},
            rawBody: '{"test":"data"}',
            path: '/webhooks/kick'
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };
        mockNext = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe responder con challenge si se recibe una solicitud de verificación', async () => {
        mockReq.body = { challenge: 'kick-challenge-123' };

        await validateKickWebhook(
            mockReq as RequestWithWebhookData,
            mockRes as Response,
            mockNext
        );

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.send).toHaveBeenCalledWith('kick-challenge-123');
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('debe lanzar error si faltan headers requeridos', async () => {
        (mockReq.header as jest.Mock).mockReturnValue(undefined);

        await validateKickWebhook(
            mockReq as RequestWithWebhookData,
            mockRes as Response,
            mockNext
        );

        expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
        expect(error.message).toBe('Missing signature, timestamp, or message id');
        expect(error.statusCode).toBe(400);
    });

    it('debe lanzar error si falta rawBody', async () => {
        (mockReq.header as jest.Mock).mockImplementation((name: string) => {
            if (name.includes('Signature')) return 'sig';
            if (name.includes('Timestamp')) return new Date().toISOString();
            if (name.includes('Id')) return 'msg123';
            return undefined;
        });
        mockReq.rawBody = undefined;

        await validateKickWebhook(
            mockReq as RequestWithWebhookData,
            mockRes as Response,
            mockNext
        );

        expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
        expect(error.message).toBe('Raw payload required for validation');
    });

    it('debe lanzar error si la firma es inválida', async () => {
        (mockReq.header as jest.Mock).mockImplementation((name: string) => {
            if (name.includes('Signature')) return 'wrong-sig';
            if (name.includes('Timestamp')) return new Date().toISOString();
            if (name.includes('Id')) return 'msg123';
            return undefined;
        });
        (KickWebhookService.verifySignature as jest.Mock).mockResolvedValue(false);

        await validateKickWebhook(
            mockReq as RequestWithWebhookData,
            mockRes as Response,
            mockNext
        );

        expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
        expect(error.statusCode).toBe(401);
    });

    it('debe llamar a next() si la firma es válida o si se salta la verificación', async () => {
        const timestamp = new Date().toISOString();
        (mockReq.header as jest.Mock).mockImplementation((name: string) => {
            if (name.includes('Signature')) return 'valid-sig';
            if (name.includes('Timestamp')) return timestamp;
            if (name.includes('Id')) return 'msg123';
            return 'event-type';
        });
        (KickWebhookService.verifySignature as jest.Mock).mockResolvedValue(true);

        await validateKickWebhook(
            mockReq as RequestWithWebhookData,
            mockRes as Response,
            mockNext
        );

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockReq.webhookData).toEqual({
            signature: 'valid-sig',
            timestamp,
            messageId: 'msg123',
            eventType: 'event-type',
            body: {}
        });
    });

    it('debe llamar a next(error) ante un fallo inesperado', async () => {
        (mockReq.header as jest.Mock).mockImplementation(() => { throw new Error('Unexpected'); });

        await validateKickWebhook(
            mockReq as RequestWithWebhookData,
            mockRes as Response,
            mockNext
        );

        expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
        expect(error.statusCode).toBe(500);
    });
});
