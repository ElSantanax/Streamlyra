import { TokenRefreshService } from '../TokenRefreshService';
import { ConnectionRepository } from '../../../repositories/implementations/ConnectionRepository';
import { TwitchService } from '../../platforms/TwitchService';
import { YouTubeService } from '../../platforms/YouTubeService';
import { KickService } from '../../platforms/KickService';
import { Connection } from '../../../models/Connection.model';
import { logger } from '../../../utils/logger';

// Mock dependencies (Automatic mocks)
jest.mock('../../../repositories/implementations/ConnectionRepository');
jest.mock('../../platforms/TwitchService');
jest.mock('../../platforms/YouTubeService');
jest.mock('../../platforms/KickService');

jest.mock('../../../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }
}));

describe('TokenRefreshService', () => {
    let service: TokenRefreshService;
    let mockConnectionRepository: jest.Mocked<ConnectionRepository>;

    // Capture the mock instances that were created when TokenRefreshService was imported.
    // Since TokenRefreshService instantiates them at module level, they correspond to
    // the first instance of each mock.
    let mockTwitchService: jest.Mocked<TwitchService>;
    let mockYouTubeService: jest.Mocked<YouTubeService>;
    let mockKickService: jest.Mocked<KickService>;

    const mockUserId = 'user-123';

    beforeAll(() => {
        // Access the instances created by the module import
        // Note: Casting to jest.Mock because proper types hide the .mock property
        mockTwitchService = (TwitchService as unknown as jest.Mock).mock.instances[0];
        mockYouTubeService = (YouTubeService as unknown as jest.Mock).mock.instances[0];
        mockKickService = (KickService as unknown as jest.Mock).mock.instances[0];

        if (!mockTwitchService) {
            throw new Error('TwitchService mock instance not found. Maintainer: Ensure jest.mock is working and module instantiation happens.');
        }
    });

    beforeEach(() => {
        // Do NOT use clearAllMocks() here if it wipes .mock.instances
        // Just clear usage data
        jest.clearAllMocks();
        // Wait, jest.clearAllMocks() DOES clear instances.
        // We need to preserve the instances we captured in beforeAll.

        // Actually, since we captured the *reference* to the instance object in `mockTwitchService`,
        // clearing `TwitchService.mock.instances` array (which exists on the constructor)
        // does NOT destroy the instance object itself. We still hold a reference to it!
        // So we can still assert on `mockTwitchService.refreshAccessToken`.

        // However, we mock methods on this instance.

        mockConnectionRepository = new ConnectionRepository() as jest.Mocked<ConnectionRepository>;

        // We create a NEW service instance, passing the repository.
        // BUT the internal platform services are STATICALLY defined in the module.
        // So `service` will use the SAME `PLATFORM_SERVICES` map created at import time.
        // That map holds `mockTwitchService`, etc.
        service = new TokenRefreshService(mockConnectionRepository);
    });

    describe('getValidAccessToken', () => {
        it('should return null if connection does not exist', async () => {
            mockConnectionRepository.findByUserAndProvider.mockResolvedValue(null);

            const result = await service.getValidAccessToken(mockUserId, 'twitch');

            expect(result).toBeNull();
            expect(mockConnectionRepository.findByUserAndProvider).toHaveBeenCalledWith(mockUserId, 'twitch');
        });

        it('should return existing token immediately for TikTok (no refresh supported)', async () => {
            const mockConnection = {
                accessToken: 'tiktok-token',
                expiryDate: new Date(Date.now() - 10000)
            } as Connection;

            mockConnectionRepository.findByUserAndProvider.mockResolvedValue(mockConnection);

            const result = await service.getValidAccessToken(mockUserId, 'tiktok');

            expect(result).toBe('tiktok-token');
        });

        it('should return existing token if it is still valid (not expired)', async () => {
            const futureDate = new Date(Date.now() + 3600 * 1000); // 1 hour locally
            const mockConnection = {
                accessToken: 'valid-token',
                expiryDate: futureDate,
                refreshToken: 'refresh-token'
            } as Connection;

            mockConnectionRepository.findByUserAndProvider.mockResolvedValue(mockConnection);

            const result = await service.getValidAccessToken(mockUserId, 'twitch');

            expect(result).toBe('valid-token');
            expect(mockTwitchService.refreshAccessToken).not.toHaveBeenCalled();
        });

        it('should refresh token if it is expired or close to expiry', async () => {
            const expiredDate = new Date(Date.now() - 1000);
            const mockConnection = {
                id: 'conn-1',
                accessToken: 'old-token',
                refreshToken: 'refresh-token',
                expiryDate: expiredDate,
                save: jest.fn().mockResolvedValue(true)
            } as unknown as Connection;

            mockConnectionRepository.findByUserAndProvider.mockResolvedValue(mockConnection);

            // Configure the mock on the captured instance
            (mockTwitchService.refreshAccessToken as jest.Mock).mockResolvedValue({
                access_token: 'new-token',
                refresh_token: 'new-refresh-token',
                expires_in: 3600
            });

            const result = await service.getValidAccessToken(mockUserId, 'twitch');

            expect(result).toBe('new-token');
            expect(mockTwitchService.refreshAccessToken).toHaveBeenCalledWith('refresh-token');
            expect(mockConnection.accessToken).toBe('new-token');
            expect(mockConnection.refreshToken).toBe('new-refresh-token');
            expect(mockConnection.save).toHaveBeenCalled();
        });

        it('should return old acess token if refresh fails', async () => {
            const expiredDate = new Date(Date.now() - 1000);
            const mockConnection = {
                id: 'conn-1',
                accessToken: 'old-token',
                refreshToken: 'refresh-token',
                expiryDate: expiredDate,
                save: jest.fn()
            } as unknown as Connection;

            mockConnectionRepository.findByUserAndProvider.mockResolvedValue(mockConnection);
            (mockTwitchService.refreshAccessToken as jest.Mock).mockRejectedValue(new Error('Refresh failed'));

            const result = await service.getValidAccessToken(mockUserId, 'twitch');

            // Fallback behavior
            expect(result).toBe('old-token');
            expect(logger.error).toHaveBeenCalled();
        });

        it('should return existing token if no refresh token is available', async () => {
            const expiredDate = new Date(Date.now() - 1000);
            const mockConnection = {
                id: 'conn-1',
                accessToken: 'no-refresh-token-access-token',
                expiryDate: expiredDate,
                refreshToken: null
            } as unknown as Connection;

            mockConnectionRepository.findByUserAndProvider.mockResolvedValue(mockConnection);

            const result = await service.getValidAccessToken(mockUserId, 'twitch');

            expect(result).toBe('no-refresh-token-access-token');
            expect(logger.warn).toHaveBeenCalledWith(
                expect.objectContaining({ connectionId: 'conn-1' }),
                'No refresh token available'
            );
        });
    });

    describe('forceTokenRefresh', () => {
        it('should return null if connection does not exist', async () => {
            mockConnectionRepository.findByUserAndProvider.mockResolvedValue(null);

            const result = await service.forceTokenRefresh(mockUserId, 'twitch');

            expect(result).toBeNull();
            expect(logger.error).toHaveBeenCalledWith(
                expect.anything(),
                'Cannot force refresh: No connection found'
            );
        });

        it('should return null for TikTok', async () => {
            const mockConnection = {
                id: 'conn-tiktok'
            } as Connection;
            mockConnectionRepository.findByUserAndProvider.mockResolvedValue(mockConnection);

            const result = await service.forceTokenRefresh(mockUserId, 'tiktok');

            expect(result).toBeNull();
            expect(logger.warn).toHaveBeenCalledWith(
                expect.anything(),
                'Cannot force refresh: TikTok does not support token refresh'
            );
        });

        it('should return null if no refresh token available', async () => {
            const mockConnection = {
                id: 'conn-1',
                refreshToken: null
            } as unknown as Connection;
            mockConnectionRepository.findByUserAndProvider.mockResolvedValue(mockConnection);

            const result = await service.forceTokenRefresh(mockUserId, 'twitch');

            expect(result).toBeNull();
            expect(logger.error).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('No refresh token available')
            );
        });

        it('should force refresh even if valid', async () => {
            const mockConnection = {
                id: 'conn-1',
                accessToken: 'old-token',
                refreshToken: 'refresh-token',
                // Date far in the future
                expiryDate: new Date(Date.now() + 1000000),
                save: jest.fn().mockResolvedValue(true)
            } as unknown as Connection;

            mockConnectionRepository.findByUserAndProvider.mockResolvedValue(mockConnection);

            (mockTwitchService.refreshAccessToken as jest.Mock).mockResolvedValue({
                access_token: 'forced-new-token',
                expires_in: 3600
            });

            const result = await service.forceTokenRefresh(mockUserId, 'twitch');

            expect(result).toBe('forced-new-token');
            expect(mockTwitchService.refreshAccessToken).toHaveBeenCalled();
        });
    });
});
