import axios from 'axios';
import { YouTubeBroadcastDiscovery } from '../YouTubeBroadcastDiscovery';
import { YouTubeQuotaManager } from '../../../platforms/YouTubeQuotaManager';
import { YouTubeStreamContext } from '../../../../models/YouTubeStreamContext.model';
import { YouTubeError, YouTubeErrorType } from '../YouTubeError';

jest.mock('axios');
jest.mock('../../../platforms/YouTubeQuotaManager');
jest.mock('../../../../models/YouTubeStreamContext.model');
jest.mock('../../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    }
}));

describe('YouTubeBroadcastDiscovery', () => {
    let discovery: YouTubeBroadcastDiscovery;
    let mockQuotaManager: jest.Mocked<YouTubeQuotaManager>;

    const accessToken = 'fake-token';
    const channelId = 'channel-123';

    beforeEach(() => {
        discovery = new YouTubeBroadcastDiscovery();

        mockQuotaManager = {
            hasQuota: jest.fn().mockResolvedValue(true),
            consumeQuota: jest.fn().mockResolvedValue(undefined),
            markAsExhausted: jest.fn().mockResolvedValue(undefined)
        } as unknown as jest.Mocked<YouTubeQuotaManager>;

        (YouTubeQuotaManager.getInstance as jest.Mock).mockReturnValue(mockQuotaManager);

        jest.clearAllMocks();
    });

    it('debería retornar el broadcast cacheado si el contexto está activo y no se omite la caché', async () => {
        const mockContext = {
            videoId: 'v1',
            liveChatId: 'chat1',
            channelId: channelId,
            startedAt: new Date()
        };
        (YouTubeStreamContext.findOne as jest.Mock).mockResolvedValue(mockContext);

        const result = await discovery.findLiveBroadcast(accessToken, channelId);

        expect(result?.id).toBe('v1');
        expect(result?.snippet?.liveChatId).toBe('chat1');
        expect(YouTubeStreamContext.findOne).toHaveBeenCalledWith({
            where: { channelId, isActive: true }
        });
        expect(axios.get).not.toHaveBeenCalled();
    });

    it('debería lanzar error QUOTA_EXCEEDED si no queda cuota', async () => {
        mockQuotaManager.hasQuota.mockResolvedValue(false);

        await expect(discovery.findLiveBroadcast(accessToken, channelId, true))
            .rejects.toThrow(YouTubeError);

        try {
            await discovery.findLiveBroadcast(accessToken, channelId, true);
        } catch (e) {
            expect((e as YouTubeError).type).toBe(YouTubeErrorType.QUOTA_EXCEEDED);
        }
    });

    it('debería obtener y retornar el broadcast en vivo desde la API', async () => {
        (YouTubeStreamContext.findOne as jest.Mock).mockResolvedValue(null);

        const mockResponse = {
            data: {
                items: [
                    {
                        id: 'v2',
                        snippet: { liveChatId: 'chat2' },
                        status: { lifeCycleStatus: 'live' }
                    }
                ]
            }
        };
        (axios.get as jest.Mock).mockResolvedValue(mockResponse);

        const result = await discovery.findLiveBroadcast(accessToken, channelId, true);

        expect(result?.id).toBe('v2');
        expect(mockQuotaManager.consumeQuota).toHaveBeenCalled();
        expect(axios.get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
            params: expect.objectContaining({ mine: true })
        }));
    });

    it('debería filtrar solo broadcasts en vivo/activos con ID de chat', async () => {
        const mockResponse = {
            data: {
                items: [
                    { id: 'v_offline', snippet: {}, status: { lifeCycleStatus: 'completed' } },
                    { id: 'v_live_no_chat', snippet: {}, status: { lifeCycleStatus: 'live' } },
                    { id: 'v_live_ok', snippet: { liveChatId: 'c1' }, status: { lifeCycleStatus: 'active' } }
                ]
            }
        };
        (axios.get as jest.Mock).mockResolvedValue(mockResponse);

        const result = await discovery.findLiveBroadcast(accessToken, channelId, true);

        expect(result?.id).toBe('v_live_ok');
    });

    it('debería manejar quotaExceeded de la API', async () => {
        const quotaError = {
            isAxiosError: true,
            response: {
                status: 403,
                data: {
                    error: { errors: [{ reason: 'quotaExceeded' }] }
                }
            }
        };
        (axios.get as jest.Mock).mockRejectedValue(quotaError);
        (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

        await expect(discovery.findLiveBroadcast(accessToken, channelId, true))
            .rejects.toThrow(YouTubeError);

        expect(mockQuotaManager.markAsExhausted).toHaveBeenCalled();
    });

    it('debería retornar null en caso de error general de la API después de registrarlo', async () => {
        (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));
        (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(false);

        const result = await discovery.findLiveBroadcast(accessToken, channelId, true);
        expect(result).toBeNull();
    });
});
