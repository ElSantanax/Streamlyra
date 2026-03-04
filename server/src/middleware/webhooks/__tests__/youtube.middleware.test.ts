import { validateYouTubeWebhook, RequestWithYouTubeWebhookData } from '../youtube.middleware';
import { Response, NextFunction } from 'express';
import { youtubePubSubService } from '../../../services/chat/youtube/YouTubePubSubService';
import { YouTubeSubscription } from '../../../models/YouTubeSubscription.model';
import { encryptionService } from '../../../services/security/EncryptionService';
import { AppError } from '../../../utils/AppError';

jest.mock('../../../services/chat/youtube/YouTubePubSubService');
jest.mock('../../../models/YouTubeSubscription.model');
jest.mock('../../../services/security/EncryptionService');
jest.mock('../../../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
    },
}));

describe('YouTube Webhook Middleware', () => {
    let mockReq: Partial<RequestWithYouTubeWebhookData>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockReq = {
            method: 'POST',
            header: jest.fn(),
            query: {},
            body: {},
            rawBody: '<feed><yt:channelId>ch123</yt:channelId></feed>',
            path: '/webhooks/youtube'
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            type: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };
        mockNext = jest.fn();

        (encryptionService.isEncrypted as jest.Mock).mockReturnValue(true);
        (encryptionService.decrypt as jest.Mock).mockReturnValue('plain-secret');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET (Verificación)', () => {
        beforeEach(() => {
            mockReq.method = 'GET';
            mockReq.query = {
                'hub.mode': 'subscribe',
                'hub.topic': 'https://www.youtube.com/xml/feeds/videos.xml?channel_id=ch123',
                'hub.challenge': 'challenge-code'
            };
        });

        it('debe lanzar error si faltan parámetros de verificación', async () => {
            mockReq.query = {};
            await validateYouTubeWebhook(mockReq as RequestWithYouTubeWebhookData, mockRes as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
            expect(error.statusCode).toBe(400);
        });

        it('debe responder con el challenge si la suscripción existe', async () => {
            const mockSubscription = { id: 1, channelId: 'ch123', secret: 'secret', update: jest.fn().mockResolvedValue({}) };
            (YouTubeSubscription.findOne as jest.Mock).mockResolvedValue(mockSubscription);
            (youtubePubSubService.handleVerification as jest.Mock).mockResolvedValue('challenge-code');

            await validateYouTubeWebhook(mockReq as RequestWithYouTubeWebhookData, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.send).toHaveBeenCalledWith('challenge-code');
        });

        it('debe lanzar 404 si la suscripción no existe', async () => {
            (YouTubeSubscription.findOne as jest.Mock).mockResolvedValue(null);
            await validateYouTubeWebhook(mockReq as RequestWithYouTubeWebhookData, mockRes as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
            expect(error.statusCode).toBe(404);
        });

        it('debe lanzar error 400 si el topic no contiene el channel_id', async () => {
            mockReq.query!['hub.topic'] = 'https://www.youtube.com/xml/feeds/videos.xml';
            await validateYouTubeWebhook(mockReq as RequestWithYouTubeWebhookData, mockRes as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
            expect(error.statusCode).toBe(400);
            expect(error.message).toBe('Invalid topic URL');
        });
    });

    describe('POST (Notificación)', () => {
        beforeEach(() => {
            mockReq.method = 'POST';
            (mockReq.header as jest.Mock).mockImplementation((name: string) => {
                if (name === 'X-Hub-Signature') return 'sha1=signature';
                return undefined;
            });
        });

        it('debe lanzar error si falta la firma', async () => {
            (mockReq.header as jest.Mock).mockReturnValue(undefined);
            await validateYouTubeWebhook(mockReq as RequestWithYouTubeWebhookData, mockRes as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
            expect(error.statusCode).toBe(401);
        });

        it('debe lanzar error si no se encuentra channelId en el body', async () => {
            mockReq.rawBody = '<invalid></invalid>';
            await validateYouTubeWebhook(mockReq as RequestWithYouTubeWebhookData, mockRes as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
            expect(error.statusCode).toBe(400);
        });

        it('debe abortar si la firma es inválida', async () => {
            const mockSubscription = { id: 1, channelId: 'ch123', secret: 'secret', status: 'verified', update: jest.fn().mockResolvedValue({}) };
            (YouTubeSubscription.findOne as jest.Mock).mockResolvedValue(mockSubscription);
            (youtubePubSubService.verifySignature as jest.Mock).mockReturnValue(false);

            await validateYouTubeWebhook(mockReq as RequestWithYouTubeWebhookData, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
            expect(error.statusCode).toBe(401);
        });

        it('debe llamar a next() si la firma es válida', async () => {
            const mockSubscription = { id: 1, channelId: 'ch123', secret: 'secret', status: 'verified', update: jest.fn().mockResolvedValue({}) };
            (YouTubeSubscription.findOne as jest.Mock).mockResolvedValue(mockSubscription);
            (youtubePubSubService.verifySignature as jest.Mock).mockReturnValue(true);
            (youtubePubSubService.updateLastNotification as jest.Mock).mockResolvedValue({});

            await validateYouTubeWebhook(mockReq as RequestWithYouTubeWebhookData, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
            expect(mockReq.youtubeWebhookData).toEqual({
                channelId: 'ch123',
                body: mockReq.rawBody
            });
        });

        it('debe lanzar error 404 si la suscripción verificada no existe', async () => {
            (YouTubeSubscription.findOne as jest.Mock).mockResolvedValue(null);
            await validateYouTubeWebhook(mockReq as RequestWithYouTubeWebhookData, mockRes as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
            expect(error.statusCode).toBe(404);
            expect(error.message).toBe('Subscription not found');
        });

        it('debe lanzar error 500 si ocurre una excepción no manejada', async () => {
            (YouTubeSubscription.findOne as jest.Mock).mockRejectedValue(new Error('Fatal DB Error'));
            await validateYouTubeWebhook(mockReq as RequestWithYouTubeWebhookData, mockRes as Response, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
            expect(error.statusCode).toBe(500);
            expect(error.message).toBe('YouTube validation failed');
        });

        it('debe realizar la migración del secreto si este no está encriptado en POST', async () => {
            const updateMock = jest.fn().mockResolvedValue({});
            const mockSubscription = { id: 1, channelId: 'ch123', secret: 'plain-secret', status: 'verified', update: updateMock };
            (YouTubeSubscription.findOne as jest.Mock).mockResolvedValue(mockSubscription);
            (encryptionService.isEncrypted as jest.Mock).mockReturnValue(false);
            (encryptionService.encrypt as jest.Mock).mockReturnValue('migrated-secret');
            (youtubePubSubService.verifySignature as jest.Mock).mockReturnValue(true);
            (youtubePubSubService.updateLastNotification as jest.Mock).mockResolvedValue({});

            await validateYouTubeWebhook(mockReq as RequestWithYouTubeWebhookData, mockRes as Response, mockNext);

            expect(encryptionService.encrypt).toHaveBeenCalledWith('plain-secret');
            expect(updateMock).toHaveBeenCalledWith({ secret: 'migrated-secret' });
            expect(mockNext).toHaveBeenCalledWith();
        });
    });
});
