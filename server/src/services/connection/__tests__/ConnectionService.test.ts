import { ConnectionService } from '../ConnectionService';
import { ConnectionRepository } from '../../../repositories/implementations/ConnectionRepository';
import { TokenRefreshService } from '../TokenRefreshService';
import { AuthTokens } from '../../../types';

// Mock dependencies
jest.mock('../../../repositories/implementations/ConnectionRepository');
jest.mock('../TokenRefreshService');

describe('ConnectionService', () => {
    let service: ConnectionService;
    let mockRepository: jest.Mocked<ConnectionRepository>;
    let mockTokenRefreshService: jest.Mocked<TokenRefreshService>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup repository mock
        mockRepository = new ConnectionRepository() as jest.Mocked<ConnectionRepository>;

        // Setup TokenRefreshService mock
        mockTokenRefreshService = {
            getValidAccessToken: jest.fn(),
            forceTokenRefresh: jest.fn(),
        } as unknown as jest.Mocked<TokenRefreshService>;

        // When ConnectionService calls new TokenRefreshService, return our mock
        (TokenRefreshService as unknown as jest.Mock).mockImplementation(() => mockTokenRefreshService);

        service = new ConnectionService(mockRepository);
    });

    describe('getConnectionByProvider', () => {
        it('should call repository.findByProvider', async () => {
            const provider = 'twitch';
            const providerId = '123';
            const mockConnection = { id: 'conn-1', provider, providerId };

            mockRepository.findByProvider.mockResolvedValue(mockConnection as any);

            const result = await service.getConnectionByProvider(provider, providerId);

            expect(mockRepository.findByProvider).toHaveBeenCalledWith(provider, providerId);
            expect(result).toEqual(mockConnection);
        });
    });

    describe('getAllConnections', () => {
        it('should call repository.findAllByUserId', async () => {
            const userId = 'user-1';
            const mockConnections = [{ id: 'conn-1' }, { id: 'conn-2' }];

            mockRepository.findAllByUserId.mockResolvedValue(mockConnections as any);

            const result = await service.getAllConnections(userId);

            expect(mockRepository.findAllByUserId).toHaveBeenCalledWith(userId);
            expect(result).toEqual(mockConnections);
        });
    });

    describe('createOrUpdateConnection', () => {
        it('should call repository.createOrUpdate', async () => {
            const userId = 'user-1';
            const provider = 'twitch';
            const providerId = '123';
            const username = 'testuser';
            const tokens: AuthTokens = {
                access_token: 'token',
                refresh_token: 'refresh',
                expires_in: 3600
            };
            const mockConnection = { id: 'conn-1', userId, provider };

            mockRepository.createOrUpdate.mockResolvedValue(mockConnection as any);

            const result = await service.createOrUpdateConnection(userId, provider, providerId, username, tokens);

            expect(mockRepository.createOrUpdate).toHaveBeenCalledWith(userId, provider, providerId, username, tokens);
            expect(result).toEqual(mockConnection);
        });
    });

    describe('removeConnection', () => {
        it('should call repository.removeByUserAndProvider', async () => {
            const userId = 'user-1';
            const provider = 'twitch';

            mockRepository.removeByUserAndProvider.mockResolvedValue(1);

            const result = await service.removeConnection(userId, provider);

            expect(mockRepository.removeByUserAndProvider).toHaveBeenCalledWith(userId, provider);
            expect(result).toBe(1);
        });
    });

    describe('getValidAccessToken', () => {
        it('should delegate to tokenRefreshService.getValidAccessToken', async () => {
            const userId = 'user-1';
            const platform = 'twitch';
            const expectedToken = 'valid-token';

            mockTokenRefreshService.getValidAccessToken.mockResolvedValue(expectedToken);

            const result = await service.getValidAccessToken(userId, platform);

            expect(mockTokenRefreshService.getValidAccessToken).toHaveBeenCalledWith(userId, platform);
            expect(result).toBe(expectedToken);
        });
    });

    describe('forceTokenRefresh', () => {
        it('should delegate to tokenRefreshService.forceTokenRefresh', async () => {
            const userId = 'user-1';
            const platform = 'twitch';
            const expectedToken = 'new-token';

            mockTokenRefreshService.forceTokenRefresh.mockResolvedValue(expectedToken);

            const result = await service.forceTokenRefresh(userId, platform);

            expect(mockTokenRefreshService.forceTokenRefresh).toHaveBeenCalledWith(userId, platform);
            expect(result).toBe(expectedToken);
        });
    });
});
