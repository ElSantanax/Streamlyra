import { AuthFlowProcessor } from '../AuthFlowProcessor';
import { PlatformAuthHandler } from '../core/PlatformAuthHandler';
import { ChatManager } from '../../core/ChatManager';
import { ConnectionService } from '../../connection/ConnectionService';
import { PlatformServiceFactory } from '../../platforms/PlatformServiceFactory';
import { StreamSessionManager } from '../../core/StreamSessionManager';
import { AppError } from '../../../utils/AppError';
import { Platform } from '../../../constants/platforms';
import { AuthTokens, PlatformProfile } from '../../../types';
import { AuthResponse } from '../AuthDTOBuilder';
import { UserDTO } from '../../../utils/userUtils';
import { Server } from 'socket.io';
import { IConnectionRepository } from '../../../repositories/interfaces/IConnectionRepository';
import { UserService } from '../../user/UserService';
import { AuthDTOBuilder } from '../AuthDTOBuilder';

jest.mock('../core/PlatformAuthHandler');
jest.mock('../../core/ChatManager');
jest.mock('../../connection/ConnectionService');
jest.mock('../../platforms/PlatformServiceFactory');
jest.mock('../../core/StreamSessionManager');
jest.mock('../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

describe('AuthFlowProcessor', () => {
    let authFlowProcessor: AuthFlowProcessor;
    let mockPlatformAuthHandler: jest.Mocked<PlatformAuthHandler>;
    let mockChatManager: jest.Mocked<ChatManager>;
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let mockStreamSessionManager: jest.Mocked<Pick<StreamSessionManager, 'clearSession'>>;

    beforeEach(() => {
        const mockUserService = {} as jest.Mocked<UserService>;
        const mockConnectionRepository = {} as jest.Mocked<IConnectionRepository>;
        const mockDtoBuilder = {} as jest.Mocked<AuthDTOBuilder>;
        const mockIo = {} as jest.Mocked<Server>;

        mockPlatformAuthHandler = new PlatformAuthHandler(
            mockUserService,
            mockConnectionRepository,
            mockDtoBuilder
        ) as jest.Mocked<PlatformAuthHandler>;

        mockChatManager = new ChatManager(
            mockIo,
            mockConnectionService
        ) as jest.Mocked<ChatManager>;

        mockConnectionService = new ConnectionService(
            mockConnectionRepository
        ) as jest.Mocked<ConnectionService>;

        mockStreamSessionManager = { clearSession: jest.fn() };

        (StreamSessionManager.getInstance as jest.Mock) = jest.fn().mockReturnValue(mockStreamSessionManager);

        authFlowProcessor = new AuthFlowProcessor(
            mockPlatformAuthHandler,
            mockChatManager,
            mockConnectionService
        );
    });

    describe('handleOAuthFlow', () => {
        it('debe procesar flujo OAuth exitosamente cuando la conexión está activa', async () => {
            const platform: Platform = 'twitch';
            const code = 'oauth-code-123';
            const codeVerifier = 'verifier-123';
            const userId = 'user123';

            const mockProfile: PlatformProfile = {
                provider: platform,
                providerId: 'twitch-id-123',
                providerUsername: 'twitchuser',
                displayName: 'Twitch User'
            };

            const mockTokens: AuthTokens = {
                access_token: 'access-token-123',
                refresh_token: 'refresh-token-123',
                expires_in: 3600
            };

            const mockAuthResponse: AuthResponse = {
                user: {
                    id: userId,
                    username: 'testuser',
                    displayName: 'Test User',
                    avatar: 'https://example.com/avatar.png'
                } as UserDTO,
                token: 'jwt-token',
                connectionActive: true,
                activationReason: 'oauth_login'
            };

            const mockOAuthService = {
                getProfileAndTokens: jest.fn().mockResolvedValue({ profile: mockProfile, tokens: mockTokens })
            };

            (PlatformServiceFactory.getService as jest.Mock) = jest.fn().mockReturnValue(mockOAuthService);
            mockPlatformAuthHandler.handlePlatformAuth = jest.fn().mockResolvedValue(mockAuthResponse);
            mockChatManager.connectProvider = jest.fn().mockResolvedValue(undefined);

            const result = await authFlowProcessor.handleOAuthFlow(platform, code, codeVerifier, userId);

            expect(PlatformServiceFactory.getService).toHaveBeenCalledWith(platform);
            expect(mockOAuthService.getProfileAndTokens).toHaveBeenCalledWith(code, codeVerifier);
            expect(mockPlatformAuthHandler.handlePlatformAuth).toHaveBeenCalledWith(mockProfile, mockTokens, userId);
            expect(mockChatManager.connectProvider).toHaveBeenCalledWith(userId, platform);
            expect(result).toEqual(mockAuthResponse);
        });

        it('no debe conectar el proveedor cuando la conexión no está activa', async () => {
            const platform: Platform = 'youtube';
            const code = 'oauth-code-456';

            const mockProfile: PlatformProfile = {
                provider: platform,
                providerId: 'youtube-id-456',
                providerUsername: 'youtubeuser',
                displayName: 'YouTube User'
            };

            const mockTokens: AuthTokens = {
                access_token: 'access-token-456',
                expires_in: 3600
            };

            const mockAuthResponse: AuthResponse = {
                user: {
                    id: 'user456',
                    username: 'testuser',
                    displayName: 'Test User',
                    avatar: 'https://example.com/avatar.png'
                } as UserDTO,
                token: 'jwt-token',
                connectionActive: false,
                activationReason: 'oauth_new_user'
            };

            const mockOAuthService = {
                getProfileAndTokens: jest.fn().mockResolvedValue({ profile: mockProfile, tokens: mockTokens })
            };

            (PlatformServiceFactory.getService as jest.Mock) = jest.fn().mockReturnValue(mockOAuthService);
            mockPlatformAuthHandler.handlePlatformAuth = jest.fn().mockResolvedValue(mockAuthResponse);
            mockChatManager.connectProvider = jest.fn();

            const result = await authFlowProcessor.handleOAuthFlow(platform, code);

            expect(mockChatManager.connectProvider).not.toHaveBeenCalled();
            expect(result).toEqual(mockAuthResponse);
        });

        it('no debe fallar cuando code es vacío', async () => {
            const platform: Platform = 'kick';
            const code = '';

            await expect(authFlowProcessor.handleOAuthFlow(platform, code)).rejects.toThrow(AppError);
            await expect(authFlowProcessor.handleOAuthFlow(platform, code)).rejects.toThrow('Código requerido');
        });
    });

    describe('handleTikTokFlow', () => {
        it('debe procesar flujo TikTok exitosamente con username válido', async () => {
            const username = 'tiktokuser';
            const userId = 'user123';

            const mockAuthResponse: AuthResponse = {
                user: {
                    id: userId,
                    username: 'testuser',
                    displayName: 'Test User',
                    avatar: 'https://example.com/avatar.png'
                } as UserDTO,
                token: 'jwt-token',
                connectionActive: true,
                activationReason: 'tiktok_connection'
            };

            mockPlatformAuthHandler.handlePlatformAuth = jest.fn().mockResolvedValue(mockAuthResponse);
            mockChatManager.connectProvider = jest.fn().mockResolvedValue(undefined);

            const result = await authFlowProcessor.handleTikTokFlow(username, userId);

            expect(mockPlatformAuthHandler.handlePlatformAuth).toHaveBeenCalledWith(
                expect.objectContaining({
                    provider: 'tiktok',
                    providerId: `tiktok_${username}`,
                    providerUsername: username,
                    displayName: username
                }),
                expect.objectContaining({
                    access_token: expect.stringMatching(/^tiktok_placeholder_/) as string,
                    expires_in: 365 * 24 * 60 * 60
                }),
                userId
            );
            expect(mockChatManager.connectProvider).toHaveBeenCalledWith(userId, 'tiktok');
            expect(result).toEqual(mockAuthResponse);
        });

        it('debe limpiar el username removiendo @ al inicio', async () => {
            const username = '@tiktokuser';
            const userId = 'user123';

            const mockAuthResponse: AuthResponse = {
                user: {
                    id: userId,
                    username: 'testuser',
                    displayName: 'Test User',
                    avatar: 'https://example.com/avatar.png'
                } as UserDTO,
                token: 'jwt-token',
                connectionActive: true,
                activationReason: 'tiktok_connection'
            };

            mockPlatformAuthHandler.handlePlatformAuth = jest.fn().mockResolvedValue(mockAuthResponse);
            mockChatManager.connectProvider = jest.fn();

            await authFlowProcessor.handleTikTokFlow(username, userId);

            expect(mockPlatformAuthHandler.handlePlatformAuth).toHaveBeenCalledWith(
                expect.objectContaining({
                    providerUsername: 'tiktokuser'
                }),
                expect.objectContaining({
                    access_token: expect.stringMatching(/^tiktok_placeholder/) as string
                }),
                userId
            );
        });

        it('no debe procesar cuando no hay sesión de usuario', async () => {
            const username = 'tiktokuser';

            await expect(authFlowProcessor.handleTikTokFlow(username, undefined)).rejects.toThrow(AppError);
            await expect(authFlowProcessor.handleTikTokFlow(username, undefined)).rejects.toThrow('Sesión requerida');
        });

        it('no debe procesar cuando username es vacío', async () => {
            const userId = 'user123';

            await expect(authFlowProcessor.handleTikTokFlow('', userId)).rejects.toThrow(AppError);
            await expect(authFlowProcessor.handleTikTokFlow('', userId)).rejects.toThrow('Usuario requerido');
        });

        it('no debe procesar username con longitud menor a 2 caracteres', async () => {
            const username = 'a';
            const userId = 'user123';

            await expect(authFlowProcessor.handleTikTokFlow(username, userId)).rejects.toThrow(AppError);
            await expect(authFlowProcessor.handleTikTokFlow(username, userId)).rejects.toThrow('Longitud inválida (2-24)');
        });

        it('no debe procesar username con longitud mayor a 24 caracteres', async () => {
            const username = 'a'.repeat(25);
            const userId = 'user123';

            await expect(authFlowProcessor.handleTikTokFlow(username, userId)).rejects.toThrow(AppError);
            await expect(authFlowProcessor.handleTikTokFlow(username, userId)).rejects.toThrow('Longitud inválida (2-24)');
        });

        it('no debe procesar username con caracteres inválidos', async () => {
            const username = 'invalid@user!';
            const userId = 'user123';

            await expect(authFlowProcessor.handleTikTokFlow(username, userId)).rejects.toThrow(AppError);
            await expect(authFlowProcessor.handleTikTokFlow(username, userId)).rejects.toThrow('Caracteres inválidos');
        });
    });

    describe('handleDisconnection', () => {
        it('debe desconectar plataforma correctamente', async () => {
            const userId = 'user123';
            const platform: Platform = 'twitch';

            mockChatManager.disconnectProvider = jest.fn().mockResolvedValue(undefined);
            mockChatManager.handleAccountDeletion = jest.fn().mockResolvedValue(undefined);
            mockConnectionService.removeConnection = jest.fn().mockResolvedValue(undefined);

            await authFlowProcessor.handleDisconnection(userId, platform);

            expect(mockChatManager.disconnectProvider).toHaveBeenCalledWith(userId, platform);
            expect(mockChatManager.handleAccountDeletion).toHaveBeenCalledWith(userId, platform);
            expect(mockConnectionService.removeConnection).toHaveBeenCalledWith(userId, platform);
        });
    });

    describe('handleLogout', () => {
        it('debe procesar logout correctamente cuando hay userId', async () => {
            const userId = 'user123';

            mockChatManager.disconnectUser = jest.fn().mockResolvedValue(undefined);

            await authFlowProcessor.handleLogout(userId);

            expect(mockChatManager.disconnectUser).toHaveBeenCalledWith(userId);
            expect(mockStreamSessionManager.clearSession).toHaveBeenCalledWith(userId);
        });

        it('no debe procesar cuando userId es undefined', async () => {
            mockChatManager.disconnectUser = jest.fn();

            await authFlowProcessor.handleLogout(undefined);

            expect(mockChatManager.disconnectUser).not.toHaveBeenCalled();
            expect(mockStreamSessionManager.clearSession).not.toHaveBeenCalled();
        });
    });
});
