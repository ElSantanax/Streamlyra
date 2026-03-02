import axios from 'axios';
import { YouTubeLiveChatService } from '../YouTubeLiveChatService';
import { YouTubeQuotaManager } from '../../YouTubeQuotaManager';
import { YouTubeStreamContext } from '../../../../models/YouTubeStreamContext.model';

jest.mock('axios');
jest.mock('../../YouTubeQuotaManager');
jest.mock('../../../../models/YouTubeStreamContext.model');
jest.mock('../../../../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn()
    }
}));

describe('YouTubeLiveChatService', () => {
    let service: YouTubeLiveChatService;
    let mockQuotaManager: jest.Mocked<YouTubeQuotaManager>;
    const mockAccessToken = 'test-youtube-token';

    beforeEach(() => {
        jest.clearAllMocks();
        service = new YouTubeLiveChatService();
        
        mockQuotaManager = {
            hasQuota: jest.fn(),
            consumeQuota: jest.fn(),
            markAsExhausted: jest.fn()
        } as unknown as jest.Mocked<YouTubeQuotaManager>;
        
        (YouTubeQuotaManager.getInstance as jest.Mock).mockReturnValue(mockQuotaManager);
    });

    describe('getActiveLiveChatId', () => {
        it('debe retornar liveChatId desde cache cuando existe', async () => {
            const mockContext = {
                channelId: 'channel-123',
                liveChatId: 'chat-cached-123',
                isActive: true
            };
            (YouTubeStreamContext.findOne as jest.Mock).mockResolvedValue(mockContext);

            const result = await service.getActiveLiveChatId(mockAccessToken, 'channel-123');

            expect(result).toBe('chat-cached-123');
            expect(axios.get).not.toHaveBeenCalled();
        });

        it('debe obtener liveChatId desde API cuando no hay cache', async () => {
            (YouTubeStreamContext.findOne as jest.Mock).mockResolvedValue(null);
            mockQuotaManager.hasQuota.mockResolvedValue(true);
            mockQuotaManager.consumeQuota.mockResolvedValue(undefined);

            const mockResponse = {
                data: {
                    items: [{
                        id: 'broadcast-123',
                        snippet: { liveChatId: 'chat-api-123' }
                    }]
                }
            };
            (axios.get as jest.Mock).mockResolvedValue(mockResponse);

            const result = await service.getActiveLiveChatId(mockAccessToken, 'channel-123');

            expect(result).toBe('chat-api-123');
            expect(mockQuotaManager.consumeQuota).toHaveBeenCalled();
        });

        it('debe retornar null cuando no hay broadcasts activos', async () => {
            (YouTubeStreamContext.findOne as jest.Mock).mockResolvedValue(null);
            mockQuotaManager.hasQuota.mockResolvedValue(true);
            mockQuotaManager.consumeQuota.mockResolvedValue(undefined);

            const mockResponse = {
                data: { items: [] }
            };
            (axios.get as jest.Mock).mockResolvedValue(mockResponse);

            const result = await service.getActiveLiveChatId(mockAccessToken);

            expect(result).toBeNull();
        });

        it('debe retornar null cuando quota está agotada', async () => {
            (YouTubeStreamContext.findOne as jest.Mock).mockResolvedValue(null);
            mockQuotaManager.hasQuota.mockResolvedValue(false);

            const result = await service.getActiveLiveChatId(mockAccessToken);

            expect(result).toBeNull();
            expect(axios.get).not.toHaveBeenCalled();
        });
    });

    describe('sendChatMessage', () => {
        it('debe enviar mensaje correctamente', async () => {
            mockQuotaManager.hasQuota.mockResolvedValue(true);
            mockQuotaManager.consumeQuota.mockResolvedValue(undefined);

            const mockResponse = {
                data: { id: 'msg-123' }
            };
            (axios.post as jest.Mock).mockResolvedValue(mockResponse);

            const result = await service.sendChatMessage(
                mockAccessToken,
                'chat-123',
                'Hello YouTube'
            );

            expect(result).toBe('msg-123');
            expect(mockQuotaManager.consumeQuota).toHaveBeenCalled();
        });

        it('debe lanzar error cuando quota está agotada', async () => {
            mockQuotaManager.hasQuota.mockResolvedValue(false);

            const messagePromise = service.sendChatMessage(
                mockAccessToken,
                'chat-123',
                'Test'
            );

            await expect(messagePromise).rejects.toThrow('Cuota de YouTube agotada');
        });

        it('debe manejar error 401 correctamente', async () => {
            mockQuotaManager.hasQuota.mockResolvedValue(true);

            const error = new Error('Unauthorized');
            Object.assign(error, {
                isAxiosError: true,
                response: {
                    status: 401,
                    data: {}
                }
            });
            (axios.post as jest.Mock).mockRejectedValue(error);
            jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

            const messagePromise = service.sendChatMessage(
                mockAccessToken,
                'chat-123',
                'Test'
            );

            await expect(messagePromise).rejects.toThrow('Token de acceso inválido o expirado');
        });

        it('debe manejar error 404 correctamente', async () => {
            mockQuotaManager.hasQuota.mockResolvedValue(true);

            const error = new Error('Not Found');
            Object.assign(error, {
                isAxiosError: true,
                response: {
                    status: 404,
                    data: {}
                }
            });
            (axios.post as jest.Mock).mockRejectedValue(error);
            jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

            const messagePromise = service.sendChatMessage(
                mockAccessToken,
                'chat-123',
                'Test'
            );

            await expect(messagePromise).rejects.toThrow('Chat en vivo no encontrado');
        });
    });
});
