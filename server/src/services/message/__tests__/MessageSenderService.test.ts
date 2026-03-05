import { MessageSenderService } from '../MessageSenderService';
import { ConnectionService } from '../../connection/ConnectionService';
import { TwitchService } from '../../platforms/TwitchService';
import { YouTubeService } from '../../platforms/YouTubeService';
import { KickService } from '../../platforms/KickService';
import { PlatformSendHelper } from '../PlatformSendHelper';
import { sentMessageCache } from '../../../utils/SentMessageCache';
import { SendMessageRequest, PlatformResult } from '../../../types/message.types';
import { Connection } from '../../../models/Connection.model';
import { Platform } from '../../../constants/platforms';

jest.mock('../PlatformSendHelper');
jest.mock('../../../utils/SentMessageCache', () => ({
    sentMessageCache: {
        markAsSent: jest.fn()
    }
}));
jest.mock('../../../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));

describe('MessageSenderService', () => {
    let messageSenderService: MessageSenderService;
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let mockTwitchService: jest.Mocked<TwitchService>;
    let mockYouTubeService: jest.Mocked<YouTubeService>;
    let mockKickService: jest.Mocked<KickService>;
    let mockHelper: jest.Mocked<PlatformSendHelper>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockConnectionService = {
            getAllConnections: jest.fn()
        } as unknown as jest.Mocked<ConnectionService>;

        mockTwitchService = {} as jest.Mocked<TwitchService>;
        mockYouTubeService = {} as jest.Mocked<YouTubeService>;
        mockKickService = {} as jest.Mocked<KickService>;

        mockHelper = {
            sendWithRetry: jest.fn()
        } as unknown as jest.Mocked<PlatformSendHelper>;

        (PlatformSendHelper as jest.MockedClass<typeof PlatformSendHelper>).mockImplementation(() => mockHelper);

        messageSenderService = new MessageSenderService(
            mockConnectionService,
            mockTwitchService,
            mockYouTubeService,
            mockKickService
        );
    });

    describe('sendMessage', () => {
        it('debe enviar mensaje a plataformas especificadas exitosamente', async () => {
            const request: SendMessageRequest = {
                userId: 'user-123',
                message: 'Test message',
                platforms: ['twitch', 'youtube']
            };

            const successResult: PlatformResult = {
                platform: 'twitch',
                success: true,
                messageId: 'msg-123'
            };

            mockHelper.sendWithRetry.mockResolvedValue(successResult);

            const response = await messageSenderService.sendMessage(request);

            expect(sentMessageCache.markAsSent).toHaveBeenCalledWith('user-123', 'Test message');
            expect(mockHelper.sendWithRetry).toHaveBeenCalledTimes(2);
            expect(response.success).toBe(true);
            expect(response.results).toHaveLength(2);
            expect(response.timestamp).toBeDefined();
        });

        it('debe enviar a todas las conexiones cuando no se especifican plataformas', async () => {
            const request: SendMessageRequest = {
                userId: 'user-123',
                message: 'Test message',
                platforms: []
            };

            const connections = [
                { provider: 'twitch' },
                { provider: 'youtube' },
                { provider: 'kick' }
            ] as unknown as Connection[];

            mockConnectionService.getAllConnections.mockResolvedValue(connections);
            mockHelper.sendWithRetry.mockResolvedValue({
                platform: 'twitch',
                success: true
            });

            const response = await messageSenderService.sendMessage(request);

            expect(mockConnectionService.getAllConnections).toHaveBeenCalledWith('user-123');
            expect(mockHelper.sendWithRetry).toHaveBeenCalledTimes(3);
            expect(response.results).toHaveLength(3);
        });

        it('debe filtrar tiktok de las plataformas objetivo', async () => {
            const request: SendMessageRequest = {
                userId: 'user-123',
                message: 'Test message',
                platforms: ['twitch', 'tiktok', 'youtube']
            };

            mockHelper.sendWithRetry.mockResolvedValue({
                platform: 'twitch',
                success: true
            });

            const response = await messageSenderService.sendMessage(request);

            expect(mockHelper.sendWithRetry).toHaveBeenCalledTimes(2);
            expect(response.results).toHaveLength(2);
        });

        it('debe retornar success false cuando todos los envíos fallan', async () => {
            const request: SendMessageRequest = {
                userId: 'user-123',
                message: 'Test message',
                platforms: ['twitch']
            };

            mockHelper.sendWithRetry.mockResolvedValue({
                platform: 'twitch',
                success: false,
                error: 'Error al enviar',
                errorCode: 'SEND_ERROR'
            });

            const response = await messageSenderService.sendMessage(request);

            expect(response.success).toBe(false);
            expect(response.results[0].success).toBe(false);
        });

        it('debe retornar success true cuando al menos un envío es exitoso', async () => {
            const request: SendMessageRequest = {
                userId: 'user-123',
                message: 'Test message',
                platforms: ['twitch', 'youtube']
            };

            mockHelper.sendWithRetry
                .mockResolvedValueOnce({
                    platform: 'twitch',
                    success: true
                })
                .mockResolvedValueOnce({
                    platform: 'youtube',
                    success: false,
                    error: 'Error'
                });

            const response = await messageSenderService.sendMessage(request);

            expect(response.success).toBe(true);
            expect(response.results.filter(r => r.success)).toHaveLength(1);
        });

        it('debe marcar el mensaje como enviado en el cache', async () => {
            const request: SendMessageRequest = {
                userId: 'user-123',
                message: 'Test message',
                platforms: ['twitch']
            };

            mockHelper.sendWithRetry.mockResolvedValue({
                platform: 'twitch',
                success: true
            });

            await messageSenderService.sendMessage(request);

            expect(sentMessageCache.markAsSent).toHaveBeenCalledWith('user-123', 'Test message');
        });

        it('debe ejecutar los servicios de plataforma correctos a través del helper', async () => {
            mockTwitchService.sendChatMessage = jest.fn().mockResolvedValue('t1');
            mockKickService.sendChatMessage = jest.fn().mockResolvedValue('k1');

            mockHelper.sendWithRetry.mockImplementation(async (plat, _, fn) => {
                const res = await fn('token', { providerId: 'pid' } as unknown as Connection);
                return { platform: plat, success: true, ...res };
            });

            await messageSenderService.sendMessage({
                userId: 'u1', message: 'm1', platforms: ['twitch', 'kick']
            });

            expect(mockTwitchService.sendChatMessage).toHaveBeenCalled();
            expect(mockKickService.sendChatMessage).toHaveBeenCalled();
        });

        it('debe manejar la lógica de YouTube (obtener liveChatId si falta)', async () => {
            mockYouTubeService.getActiveLiveChatId = jest.fn().mockResolvedValue('chat-id');
            mockYouTubeService.sendChatMessage = jest.fn().mockResolvedValue('y1');

            const mockConnection = {
                providerId: 'yt-pid',
                chatroomId: null,
                save: jest.fn().mockResolvedValue(undefined)
            };

            mockHelper.sendWithRetry.mockImplementation(async (plat, _, fn) => {
                const res = await fn('token', mockConnection as unknown as Connection);
                return { platform: plat, success: true, ...res };
            });

            await messageSenderService.sendMessage({
                userId: 'u1', message: 'm1', platforms: ['youtube']
            });

            expect(mockYouTubeService.getActiveLiveChatId).toHaveBeenCalled();
            expect(mockYouTubeService.sendChatMessage).toHaveBeenCalledWith('token', 'chat-id', 'm1');
            expect(mockConnection.save).toHaveBeenCalled();
        });

        it('debe manejar errores en YouTube al intentar obtener el liveChatId', async () => {
            mockYouTubeService.getActiveLiveChatId = jest.fn().mockRejectedValue(new Error('API Error'));

            const mockConnection = { providerId: 'yt-pid', chatroomId: null };

            mockHelper.sendWithRetry.mockImplementation(async (plat, _, fn) => {
                try {
                    await fn('token', mockConnection as unknown as Connection);
                    return { platform: plat, success: true };
                } catch (e: unknown) {
                    return { platform: plat, success: false, error: (e as Error).message };
                }
            });

            const response = await messageSenderService.sendMessage({
                userId: 'u1', message: 'm1', platforms: ['youtube']
            });

            expect(response.results[0].error).toBe('No se pudo verificar el estado del directo en YouTube.');
        });

        it('debe manejar errores de cuota en YouTube', async () => {
            mockYouTubeService.getActiveLiveChatId = jest.fn().mockRejectedValue(new Error('cuota excedida'));

            const mockConnection = { providerId: 'yt-pid', chatroomId: null };

            mockHelper.sendWithRetry.mockImplementation(async (plat, _, fn) => {
                try {
                    await fn('token', mockConnection as unknown as Connection);
                    return { platform: plat, success: true };
                } catch (e: unknown) {
                    return { platform: plat, success: false, error: (e as Error).message };
                }
            });

            const response = await messageSenderService.sendMessage({
                userId: 'u1', message: 'm1', platforms: ['youtube']
            });

            expect(response.results[0].error).toBe('cuota excedida');
        });

        it('debe manejar plataforma no soportada', async () => {
            const response = await messageSenderService.sendMessage({
                userId: 'u1', message: 'm1', platforms: ['unknown' as unknown as Platform]
            });

            expect(response.results[0].errorCode).toBe('UNSUPPORTED_PLATFORM');
        });
    });
});
