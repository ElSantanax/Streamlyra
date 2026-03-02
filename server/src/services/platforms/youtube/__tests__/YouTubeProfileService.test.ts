import axios from 'axios';
import { YouTubeProfileService } from '../YouTubeProfileService';
import { YouTubeQuotaManager } from '../../YouTubeQuotaManager';
import { YouTubeTokenDecoder } from '../YouTubeTokenDecoder';
import { YouTubeQuotaErrorHandler } from '../YouTubeQuotaErrorHandler';

jest.mock('axios');
jest.mock('../../YouTubeQuotaManager');
jest.mock('../YouTubeTokenDecoder');
jest.mock('../YouTubeQuotaErrorHandler');
jest.mock('../../../../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe('YouTubeProfileService', () => {
    let service: YouTubeProfileService;
    let mockQuotaManager: jest.Mocked<YouTubeQuotaManager>;
    const mockAccessToken = 'test-youtube-token';

    beforeEach(() => {
        jest.clearAllMocks();
        service = new YouTubeProfileService();

        mockQuotaManager = {
            hasQuota: jest.fn(),
            consumeQuota: jest.fn()
        } as unknown as jest.Mocked<YouTubeQuotaManager>;

        (YouTubeQuotaManager.getInstance as jest.Mock).mockReturnValue(mockQuotaManager);
    });

    describe('fetchUserProfile', () => {
        it('debe obtener perfil de usuario correctamente cuando hay cuota', async () => {
            const mockChannel = {
                id: 'channel-123',
                snippet: {
                    title: 'Test Channel',
                    thumbnails: {
                        default: { url: 'https://example.com/avatar.jpg' }
                    }
                }
            };

            mockQuotaManager.hasQuota.mockResolvedValue(true);
            (axios.get as jest.Mock).mockResolvedValue({
                data: { items: [mockChannel] }
            });

            const channelPromise = service.fetchUserProfile(mockAccessToken);

            await expect(channelPromise).resolves.toEqual(mockChannel);
            expect(mockQuotaManager.consumeQuota).toHaveBeenCalled();
        });

        it('debe usar perfil básico cuando no hay cuota disponible', async () => {
            const mockBasicProfile = {
                id: 'yt_123',
                snippet: {
                    title: 'YouTube User yt_123',
                    thumbnails: { default: { url: '' } }
                }
            };

            mockQuotaManager.hasQuota.mockResolvedValue(false);
            (YouTubeTokenDecoder.getBasicProfileFromToken as jest.Mock).mockReturnValue(mockBasicProfile);

            const channelPromise = service.fetchUserProfile(mockAccessToken);

            await expect(channelPromise).resolves.toEqual(mockBasicProfile);
            expect(axios.get).not.toHaveBeenCalled();
        });

        it('debe lanzar error cuando no se encuentra canal', async () => {
            mockQuotaManager.hasQuota.mockResolvedValue(true);
            (axios.get as jest.Mock).mockResolvedValue({
                data: { items: [] }
            });

            const channelPromise = service.fetchUserProfile(mockAccessToken);

            await expect(channelPromise).rejects.toThrow('No se encontró canal de YouTube asociado');
        });

        it('debe usar perfil básico cuando hay error de cuota', async () => {
            const mockBasicProfile = {
                id: 'yt_fallback',
                snippet: {
                    title: 'YouTube User yt_fallba',
                    thumbnails: { default: { url: '' } }
                }
            };

            mockQuotaManager.hasQuota.mockResolvedValue(true);
            (axios.get as jest.Mock).mockRejectedValue(new Error('Quota exceeded'));
            (YouTubeQuotaErrorHandler.isQuotaError as jest.Mock).mockReturnValue(true);
            (YouTubeTokenDecoder.getBasicProfileFromToken as jest.Mock).mockReturnValue(mockBasicProfile);

            const channelPromise = service.fetchUserProfile(mockAccessToken);

            await expect(channelPromise).resolves.toEqual(mockBasicProfile);
        });
    });

    describe('normalizePlatformProfile', () => {
        it('debe normalizar perfil de YouTube correctamente', () => {
            const channel = {
                id: 'channel-123',
                snippet: {
                    title: 'Test Channel Name',
                    thumbnails: {
                        default: { url: 'https://example.com/avatar.jpg' }
                    }
                }
            };

            const result = service.normalizePlatformProfile(channel);

            expect(result).toEqual({
                provider: 'youtube',
                providerId: 'channel-123',
                providerUsername: 'testchannelname',
                displayName: 'Test Channel Name',
                avatarUrl: 'https://example.com/avatar.jpg'
            });
        });

        it('debe manejar canal sin thumbnail', () => {
            const channel = {
                id: 'channel-456',
                snippet: {
                    title: 'Channel Without Avatar'
                }
            };

            const result = service.normalizePlatformProfile(channel);

            expect(result.avatarUrl).toBe('');
            expect(result.providerId).toBe('channel-456');
        });
    });
});
