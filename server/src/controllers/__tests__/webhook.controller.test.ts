import { Response, Request } from 'express';
import { WebhookController } from '../webhook.controller';
import { WebhookProcessor } from '../../services/webhook/WebhookProcessor';
import { AppError } from '../../utils/AppError';
import { KickChatMessagePayload } from '../../types/kick.types';

jest.mock('../../services/webhook/WebhookProcessor');
jest.mock('../../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));

interface WebhookData {
    signature: string;
    timestamp: string;
    messageId: string;
    eventType: string;
    body: Record<string, unknown>;
}

interface RequestWithWebhookData {
    webhookData?: WebhookData;
}

interface RequestWithYouTubeWebhookData {
    youtubeWebhookData?: {
        channelId: string;
        body: string;
    };
}

describe('WebhookController', () => {
    let webhookController: WebhookController;
    let mockWebhookProcessor: jest.Mocked<WebhookProcessor>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        mockWebhookProcessor = {
            processKickEvent: jest.fn(),
            processTwitchEvent: jest.fn(),
            processYouTubeEvent: jest.fn(),
        } as unknown as jest.Mocked<WebhookProcessor>;

        webhookController = new WebhookController(mockWebhookProcessor);

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
        };
    });

    describe('handleKickWebhook', () => {
        it('debe procesar evento de Kick cuando los datos son válidos', async () => {
            const mockKickPayload: KickChatMessagePayload = {
                message_id: 'msg123',
                broadcaster: {
                    is_anonymous: false,
                    user_id: 1,
                    username: 'broadcaster',
                    is_verified: true,
                    profile_picture: 'pic.jpg',
                    channel_slug: 'channel'
                },
                sender: {
                    is_anonymous: false,
                    user_id: 2,
                    username: 'sender',
                    is_verified: false,
                    profile_picture: 'pic2.jpg',
                    channel_slug: 'sender_channel'
                },
                content: 'test message',
                created_at: '2024-01-01'
            };

            const mockRequest: RequestWithWebhookData = {
                webhookData: {
                    signature: 'sig123',
                    timestamp: '2024-01-01',
                    messageId: 'msg123',
                    eventType: 'message',
                    body: mockKickPayload as unknown as Record<string, unknown>
                }
            };

            mockWebhookProcessor.processKickEvent.mockResolvedValue();

            await webhookController.handleKickWebhook(
                mockRequest as RequestWithWebhookData & Request,
                mockResponse as Response
            );

            expect(mockWebhookProcessor.processKickEvent).toHaveBeenCalledWith(
                mockKickPayload,
                'message'
            );
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.send).toHaveBeenCalledWith('OK');
        });

        it('no debe procesar cuando faltan datos de webhook', async () => {
            const mockRequest: RequestWithWebhookData = {
                webhookData: undefined
            };

            await expect(
                webhookController.handleKickWebhook(
                    mockRequest as RequestWithWebhookData & Request,
                    mockResponse as Response
                )
            ).rejects.toThrow(new AppError('Webhook data not found', 400));
        });
    });

    describe('handleTwitchWebhook', () => {
        it('debe procesar evento de Twitch cuando los datos son válidos', async () => {
            const mockTwitchBody = {
                subscription: { type: 'channel.follow' },
                event: { user_name: 'follower123' }
            };

            const mockRequest: RequestWithWebhookData = {
                webhookData: {
                    signature: 'sig456',
                    timestamp: '2024-01-01',
                    messageId: 'msg456',
                    eventType: 'channel.follow',
                    body: mockTwitchBody
                }
            };

            mockWebhookProcessor.processTwitchEvent.mockResolvedValue();

            await webhookController.handleTwitchWebhook(
                mockRequest as RequestWithWebhookData & Request,
                mockResponse as Response
            );

            expect(mockWebhookProcessor.processTwitchEvent).toHaveBeenCalledWith(
                mockTwitchBody,
                'channel.follow'
            );
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it('no debe procesar cuando faltan datos de webhook', async () => {
            const mockRequest: RequestWithWebhookData = {};

            await expect(
                webhookController.handleTwitchWebhook(
                    mockRequest as RequestWithWebhookData & Request,
                    mockResponse as Response
                )
            ).rejects.toThrow(new AppError('Webhook data not found', 400));
        });
    });

    describe('handleYouTubeWebhook', () => {
        it('debe procesar evento de YouTube cuando los datos son válidos', async () => {
            const mockYouTubeBody = '<feed><entry><title>New video</title></entry></feed>';

            const mockRequest: RequestWithYouTubeWebhookData = {
                youtubeWebhookData: {
                    channelId: 'channel123',
                    body: mockYouTubeBody
                }
            };

            mockWebhookProcessor.processYouTubeEvent.mockResolvedValue();

            await webhookController.handleYouTubeWebhook(
                mockRequest as RequestWithYouTubeWebhookData & Request,
                mockResponse as Response
            );

            expect(mockWebhookProcessor.processYouTubeEvent).toHaveBeenCalledWith(
                'channel123',
                mockYouTubeBody
            );
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.send).toHaveBeenCalledWith('OK');
        });

        it('no debe procesar cuando faltan datos de YouTube webhook', async () => {
            const mockRequest: RequestWithYouTubeWebhookData = {
                youtubeWebhookData: undefined
            };

            await expect(
                webhookController.handleYouTubeWebhook(
                    mockRequest as RequestWithYouTubeWebhookData & Request,
                    mockResponse as Response
                )
            ).rejects.toThrow(new AppError('YouTube webhook data not found', 400));
        });
    });
});
