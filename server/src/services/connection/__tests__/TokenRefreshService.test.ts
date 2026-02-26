import { TokenRefreshService } from '../TokenRefreshService';
import { IConnectionRepository } from '../../../repositories/interfaces/IConnectionRepository';
import { Connection } from '../../../models/Connection.model';
import { PlatformServiceFactory } from '../../platforms/PlatformServiceFactory';
import { AuthTokens } from '../../../types';

jest.mock('../../platforms/PlatformServiceFactory');
jest.mock('../../../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe('TokenRefreshService', () => {
    let service: TokenRefreshService;
    let mockRepository: jest.Mocked<IConnectionRepository>;

    const createMockConnection = (overrides?: Partial<Connection>): Connection => ({
        id: 'conn-123',
        provider: 'twitch',
        providerId: 'provider-123',
        providerUsername: 'testuser',
        chatroomId: 'chatroom-123',
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiryDate: new Date(Date.now() + 10 * 60 * 1000),
        userId: 'user-123',
        ...overrides
    } as Connection);

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        mockRepository = {
            findByUserAndProvider: jest.fn(),
            updateTokens: jest.fn(),
            clearTokens: jest.fn()
        } as unknown as jest.Mocked<IConnectionRepository>;

        service = new TokenRefreshService(mockRepository);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('getValidAccessToken', () => {
        it('debe retornar token existente cuando es válido y no está próximo a expirar', async () => {
            const validConnection = createMockConnection({
                expiryDate: new Date(Date.now() + 10 * 60 * 1000)
            });
            mockRepository.findByUserAndProvider.mockResolvedValue(validConnection);

            const result = await service.getValidAccessToken('user-123', 'twitch');

            expect(result).toBe('access-token-123');
            expect(mockRepository.findByUserAndProvider).toHaveBeenCalledWith('user-123', 'twitch');
            expect(PlatformServiceFactory.getService).not.toHaveBeenCalled();
        });

        it('debe retornar null cuando no existe conexión para el usuario', async () => {
            mockRepository.findByUserAndProvider.mockResolvedValue(null);

            const result = await service.getValidAccessToken('user-123', 'youtube');

            expect(result).toBeNull();
            expect(mockRepository.findByUserAndProvider).toHaveBeenCalledWith('user-123', 'youtube');
        });

        it('debe retornar token sin validar expiración para plataforma tiktok', async () => {
            const tiktokConnection = createMockConnection({
                provider: 'tiktok',
                expiryDate: new Date(Date.now() - 1000)
            });
            mockRepository.findByUserAndProvider.mockResolvedValue(tiktokConnection);

            const result = await service.getValidAccessToken('user-123', 'tiktok');

            expect(result).toBe('access-token-123');
            expect(PlatformServiceFactory.getService).not.toHaveBeenCalled();
        });

        it('debe refrescar token cuando está próximo a expirar', async () => {
            const expiringConnection = createMockConnection({
                expiryDate: new Date(Date.now() + 2 * 60 * 1000)
            });
            const newTokens: AuthTokens = {
                access_token: 'new-access-token',
                refresh_token: 'new-refresh-token',
                expires_in: 3600
            };

            mockRepository.findByUserAndProvider.mockResolvedValue(expiringConnection);
            const mockService = {
                refreshAccessToken: jest.fn().mockResolvedValue(newTokens)
            };
            (PlatformServiceFactory.getService as jest.Mock).mockReturnValue(mockService);
            mockRepository.updateTokens.mockResolvedValue(expiringConnection);

            const result = await service.getValidAccessToken('user-123', 'twitch');

            expect(result).toBe('new-access-token');
            expect(mockService.refreshAccessToken).toHaveBeenCalledWith('refresh-token-123');
            expect(mockRepository.updateTokens).toHaveBeenCalledWith('conn-123', newTokens);
        });

        it('debe reutilizar promesa de refresh en curso para evitar múltiples llamadas', async () => {
            const expiringConnection = createMockConnection({
                expiryDate: new Date(Date.now() + 2 * 60 * 1000)
            });
            const newTokens: AuthTokens = {
                access_token: 'new-token',
                expires_in: 3600
            };

            mockRepository.findByUserAndProvider.mockResolvedValue(expiringConnection);
            const mockService = {
                refreshAccessToken: jest.fn().mockResolvedValue(newTokens)
            };
            (PlatformServiceFactory.getService as jest.Mock).mockReturnValue(mockService);
            mockRepository.updateTokens.mockResolvedValue(expiringConnection);

            const [result1, result2] = await Promise.all([
                service.getValidAccessToken('user-123', 'twitch'),
                service.getValidAccessToken('user-123', 'twitch')
            ]);

            expect(result1).toBe('new-token');
            expect(result2).toBe('new-token');
            expect(mockService.refreshAccessToken).toHaveBeenCalledTimes(1);
        });
    });

    describe('forceTokenRefresh', () => {
        it('debe forzar refresh de token incluso si es válido', async () => {
            const validConnection = createMockConnection({
                expiryDate: new Date(Date.now() + 10 * 60 * 1000)
            });
            const newTokens: AuthTokens = {
                access_token: 'forced-new-token',
                expires_in: 3600
            };

            mockRepository.findByUserAndProvider.mockResolvedValue(validConnection);
            const mockService = {
                refreshAccessToken: jest.fn().mockResolvedValue(newTokens)
            };
            (PlatformServiceFactory.getService as jest.Mock).mockReturnValue(mockService);
            mockRepository.updateTokens.mockResolvedValue(validConnection);

            const result = await service.forceTokenRefresh('user-123', 'twitch');

            expect(result).toBe('forced-new-token');
            expect(mockService.refreshAccessToken).toHaveBeenCalledWith('refresh-token-123');
        });

        it('debe retornar null cuando no existe conexión', async () => {
            mockRepository.findByUserAndProvider.mockResolvedValue(null);

            const result = await service.forceTokenRefresh('user-123', 'youtube');

            expect(result).toBeNull();
            expect(PlatformServiceFactory.getService).not.toHaveBeenCalled();
        });

        it('debe retornar null para plataforma tiktok sin soporte OAuth', async () => {
            const tiktokConnection = createMockConnection({
                provider: 'tiktok'
            });
            mockRepository.findByUserAndProvider.mockResolvedValue(tiktokConnection);

            const result = await service.forceTokenRefresh('user-123', 'tiktok');

            expect(result).toBeNull();
            expect(PlatformServiceFactory.getService).not.toHaveBeenCalled();
        });

        it('debe retornar null cuando conexión no tiene refresh token', async () => {
            const connectionWithoutRefresh = createMockConnection({
                refreshToken: null as unknown as string
            });
            mockRepository.findByUserAndProvider.mockResolvedValue(connectionWithoutRefresh);

            const result = await service.forceTokenRefresh('user-123', 'kick');

            expect(result).toBeNull();
        });
    });

    describe('refreshToken - manejo de errores', () => {
        it('debe reintentar hasta 3 veces en errores transitorios de red', async () => {
            const connection = createMockConnection({
                expiryDate: new Date(Date.now() + 2 * 60 * 1000)
            });
            const networkError = { code: 'ETIMEDOUT' };

            mockRepository.findByUserAndProvider.mockResolvedValue(connection);
            const mockService = {
                refreshAccessToken: jest.fn()
                    .mockRejectedValueOnce(networkError)
                    .mockRejectedValueOnce(networkError)
                    .mockRejectedValueOnce(networkError)
            };
            (PlatformServiceFactory.getService as jest.Mock).mockReturnValue(mockService);

            const resultPromise = service.getValidAccessToken('user-123', 'twitch');

            await jest.runAllTimersAsync();
            const result = await resultPromise;

            expect(result).toBeNull();
            expect(mockService.refreshAccessToken).toHaveBeenCalledTimes(3);
        });

        it('debe limpiar tokens cuando refresh token es inválido', async () => {
            const connection = createMockConnection({
                expiryDate: new Date(Date.now() + 2 * 60 * 1000)
            });
            const invalidGrantError = new Error('invalid_grant');

            mockRepository.findByUserAndProvider.mockResolvedValue(connection);
            const mockService = {
                refreshAccessToken: jest.fn().mockRejectedValue(invalidGrantError)
            };
            (PlatformServiceFactory.getService as jest.Mock).mockReturnValue(mockService);
            mockRepository.clearTokens.mockResolvedValue();

            const result = await service.getValidAccessToken('user-123', 'twitch');

            expect(result).toBeNull();
            expect(mockRepository.clearTokens).toHaveBeenCalledWith('conn-123');
        });

        it('no debe reintentar en errores permanentes de autenticación', async () => {
            const connection = createMockConnection({
                expiryDate: new Date(Date.now() + 2 * 60 * 1000)
            });
            const authError = new Error('invalid_grant: token has been revoked');

            mockRepository.findByUserAndProvider.mockResolvedValue(connection);
            const mockService = {
                refreshAccessToken: jest.fn().mockRejectedValue(authError)
            };
            (PlatformServiceFactory.getService as jest.Mock).mockReturnValue(mockService);
            mockRepository.clearTokens.mockResolvedValue();

            const result = await service.getValidAccessToken('user-123', 'twitch');

            expect(result).toBeNull();
            expect(mockService.refreshAccessToken).toHaveBeenCalledTimes(1);
            expect(mockRepository.clearTokens).toHaveBeenCalledWith('conn-123');
        });

        it('debe reintentar en errores 5xx del servidor', async () => {
            const connection = createMockConnection({
                expiryDate: new Date(Date.now() + 2 * 60 * 1000)
            });
            const serverError = { response: { status: 503 } };
            const newTokens: AuthTokens = {
                access_token: 'recovered-token',
                expires_in: 3600
            };

            mockRepository.findByUserAndProvider.mockResolvedValue(connection);
            const mockService = {
                refreshAccessToken: jest.fn()
                    .mockRejectedValueOnce(serverError)
                    .mockResolvedValueOnce(newTokens)
            };
            (PlatformServiceFactory.getService as jest.Mock).mockReturnValue(mockService);
            mockRepository.updateTokens.mockResolvedValue(connection);

            const resultPromise = service.getValidAccessToken('user-123', 'twitch');

            await jest.runAllTimersAsync();
            const result = await resultPromise;

            expect(result).toBe('recovered-token');
            expect(mockService.refreshAccessToken).toHaveBeenCalledTimes(2);
        });
    });
});
