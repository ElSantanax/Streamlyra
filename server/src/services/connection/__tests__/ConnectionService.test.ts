import { ConnectionService } from '../ConnectionService';
import { IConnectionRepository } from '../../../repositories/interfaces/IConnectionRepository';
import { TokenRefreshService } from '../TokenRefreshService';
import { Platform } from '../../../constants/platforms';
import { AuthTokens } from '../../../types/index';
import { Connection } from '../../../models/Connection.model';

jest.mock('../TokenRefreshService');

describe('ConnectionService', () => {
    let connectionService: ConnectionService;
    let mockRepository: jest.Mocked<IConnectionRepository>;
    let mockTokenRefreshService: jest.Mocked<TokenRefreshService>;

    const mockConnection: Partial<Connection> = {
        id: 'conn-123',
        userId: 'user-123',
        provider: 'twitch',
        providerId: 'provider-123',
        providerUsername: 'testuser',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiryDate: new Date('2025-12-31')
    };

    const mockTokens: AuthTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer'
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = {
            findByProvider: jest.fn(),
            findByUserAndProvider: jest.fn(),
            findAllByUserId: jest.fn(),
            createOrUpdate: jest.fn(),
            removeByUserAndProvider: jest.fn(),
            updateTokens: jest.fn(),
            clearTokens: jest.fn(),
            updateChatroomId: jest.fn()
        } as jest.Mocked<IConnectionRepository>;

        mockTokenRefreshService = {
            getValidAccessToken: jest.fn(),
            forceTokenRefresh: jest.fn()
        } as unknown as jest.Mocked<TokenRefreshService>;

        connectionService = new ConnectionService(mockRepository);
        
        Object.defineProperty(connectionService, 'tokenRefreshService', {
            value: mockTokenRefreshService,
            writable: true
        });
    });

    describe('getConnectionByProvider', () => {
        it('debe retornar la conexión cuando existe', async () => {
            const provider = 'twitch';
            const providerId = 'provider-123';

            mockRepository.findByProvider.mockResolvedValue(mockConnection as Connection);

            const result = await connectionService.getConnectionByProvider(provider, providerId);

            expect(mockRepository.findByProvider).toHaveBeenCalledWith(provider, providerId);
            expect(result).toEqual(mockConnection);
        });

        it('debe retornar null cuando la conexión no existe', async () => {
            mockRepository.findByProvider.mockResolvedValue(null);

            const result = await connectionService.getConnectionByProvider('youtube', 'nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('getAllConnections', () => {
        it('debe retornar todas las conexiones del usuario', async () => {
            const userId = 'user-123';
            const connections = [mockConnection, { ...mockConnection, provider: 'youtube' }] as Connection[];

            mockRepository.findAllByUserId.mockResolvedValue(connections);

            const result = await connectionService.getAllConnections(userId);

            expect(mockRepository.findAllByUserId).toHaveBeenCalledWith(userId);
            expect(result).toHaveLength(2);
        });

        it('debe retornar array vacío cuando el usuario no tiene conexiones', async () => {
            mockRepository.findAllByUserId.mockResolvedValue([]);

            const result = await connectionService.getAllConnections('user-without-connections');

            expect(result).toEqual([]);
        });
    });

    describe('createOrUpdateConnection', () => {
        it('debe crear o actualizar una conexión correctamente', async () => {
            const userId = 'user-123';
            const provider = 'twitch';
            const providerId = 'provider-123';
            const username = 'testuser';

            mockRepository.createOrUpdate.mockResolvedValue(mockConnection as Connection);

            const result = await connectionService.createOrUpdateConnection(
                userId,
                provider,
                providerId,
                username,
                mockTokens
            );

            expect(mockRepository.createOrUpdate).toHaveBeenCalledWith(
                userId,
                provider,
                providerId,
                username,
                mockTokens
            );
            expect(result).toEqual(mockConnection);
        });
    });

    describe('removeConnection', () => {
        it('debe eliminar la conexión del usuario', async () => {
            const userId = 'user-123';
            const provider = 'kick';

            mockRepository.removeByUserAndProvider.mockResolvedValue(1);

            const result = await connectionService.removeConnection(userId, provider);

            expect(mockRepository.removeByUserAndProvider).toHaveBeenCalledWith(userId, provider);
            expect(result).toBe(1);
        });

        it('debe retornar 0 cuando no hay conexión para eliminar', async () => {
            mockRepository.removeByUserAndProvider.mockResolvedValue(0);

            const result = await connectionService.removeConnection('user-123', 'tiktok');

            expect(result).toBe(0);
        });
    });

    describe('getValidAccessToken', () => {
        it('debe delegar al TokenRefreshService para obtener token válido', async () => {
            const userId = 'user-123';
            const platform: Platform = 'youtube';
            const validToken = 'valid-access-token';

            mockTokenRefreshService.getValidAccessToken.mockResolvedValue(validToken);

            const result = await connectionService.getValidAccessToken(userId, platform);

            expect(mockTokenRefreshService.getValidAccessToken).toHaveBeenCalledWith(userId, platform, undefined);
            expect(result).toBe(validToken);
        });

        it('debe pasar la conexión existente cuando se proporciona', async () => {
            const userId = 'user-123';
            const platform: Platform = 'twitch';
            const existingConnection = mockConnection as Connection;

            mockTokenRefreshService.getValidAccessToken.mockResolvedValue('token');

            await connectionService.getValidAccessToken(userId, platform, existingConnection);

            expect(mockTokenRefreshService.getValidAccessToken).toHaveBeenCalledWith(
                userId,
                platform,
                existingConnection
            );
        });

        it('debe retornar null cuando no hay token válido', async () => {
            mockTokenRefreshService.getValidAccessToken.mockResolvedValue(null);

            const result = await connectionService.getValidAccessToken('user-123', 'kick');

            expect(result).toBeNull();
        });
    });

    describe('forceTokenRefresh', () => {
        it('debe forzar la renovación del token', async () => {
            const userId = 'user-123';
            const platform: Platform = 'twitch';
            const newToken = 'refreshed-token';

            mockTokenRefreshService.forceTokenRefresh.mockResolvedValue(newToken);

            const result = await connectionService.forceTokenRefresh(userId, platform);

            expect(mockTokenRefreshService.forceTokenRefresh).toHaveBeenCalledWith(userId, platform);
            expect(result).toBe(newToken);
        });

        it('debe retornar null cuando la renovación falla', async () => {
            mockTokenRefreshService.forceTokenRefresh.mockResolvedValue(null);

            const result = await connectionService.forceTokenRefresh('user-123', 'youtube');

            expect(result).toBeNull();
        });
    });

    describe('updateChatroomId', () => {
        it('debe actualizar el chatroomId correctamente', async () => {
            const userId = 'user-123';
            const provider = 'kick';
            const chatroomId = 'chatroom-456';

            mockRepository.updateChatroomId.mockResolvedValue(undefined);

            await connectionService.updateChatroomId(userId, provider, chatroomId);

            expect(mockRepository.updateChatroomId).toHaveBeenCalledWith(userId, provider, chatroomId);
        });
    });

    describe('getAccount', () => {
        it('debe retornar la cuenta del usuario para la plataforma', async () => {
            const userId = 'user-123';
            const provider = 'twitch';

            mockRepository.findByUserAndProvider.mockResolvedValue(mockConnection as Connection);

            const result = await connectionService.getAccount(userId, provider);

            expect(mockRepository.findByUserAndProvider).toHaveBeenCalledWith(userId, provider);
            expect(result).toEqual(mockConnection);
        });

        it('debe retornar null cuando no existe la cuenta', async () => {
            mockRepository.findByUserAndProvider.mockResolvedValue(null);

            const result = await connectionService.getAccount('user-123', 'tiktok');

            expect(result).toBeNull();
        });
    });
});
