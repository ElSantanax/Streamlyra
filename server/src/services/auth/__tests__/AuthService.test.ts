import { AuthService } from '../AuthService';
import { AuthFlowProcessor } from '../AuthFlowProcessor';
import { UserProfileService } from '../core/UserProfileService';
import { UserService } from '../../user/UserService';
import { Platform } from '../../../constants/platforms';
import { AuthResponse, AuthDTOBuilder } from '../AuthDTOBuilder';
import { UserDTO } from '../../../utils/userUtils';
import { PlatformAuthHandler } from '../core/PlatformAuthHandler';
import { ChatManager } from '../../core/ChatManager';
import { ConnectionService } from '../../connection/ConnectionService';
import { IConnectionRepository } from '../../../repositories/interfaces/IConnectionRepository';
import { IUserRepository } from '../../../repositories/interfaces/IUserRepository';

jest.mock('../AuthFlowProcessor');
jest.mock('../core/UserProfileService');
jest.mock('../../user/UserService');

describe('AuthService', () => {
    let authService: AuthService;
    let mockFlowProcessor: jest.Mocked<AuthFlowProcessor>;
    let mockUserProfileService: jest.Mocked<UserProfileService>;
    let mockUserService: jest.Mocked<UserService>;

    beforeEach(() => {
        const mockPlatformAuthHandler = {} as jest.Mocked<PlatformAuthHandler>;
        const mockChatManager = {} as jest.Mocked<ChatManager>;
        const mockConnectionService = {} as jest.Mocked<ConnectionService>;
        const mockDtoBuilder = {} as jest.Mocked<AuthDTOBuilder>;

        mockFlowProcessor = new AuthFlowProcessor(
            mockPlatformAuthHandler,
            mockChatManager,
            mockConnectionService
        ) as jest.Mocked<AuthFlowProcessor>;

        mockUserService = new UserService(
            {} as jest.Mocked<IUserRepository>,
            {} as jest.Mocked<IConnectionRepository>
        ) as jest.Mocked<UserService>;

        mockUserProfileService = new UserProfileService(
            mockUserService,
            mockDtoBuilder
        ) as jest.Mocked<UserProfileService>;

        authService = new AuthService(mockFlowProcessor, mockUserProfileService, mockUserService);
    });

    describe('regenerateOverlayToken', () => {
        it('debe delegar la regeneración de token al UserService', async () => {
            const userId = 'user123';
            const newToken = 'new-token-uuid';
            mockUserService.regenerateOverlayToken = jest.fn().mockResolvedValue(newToken);

            const result = await authService.regenerateOverlayToken(userId);

            expect(mockUserService.regenerateOverlayToken).toHaveBeenCalledWith(userId);
            expect(result).toBe(newToken);
        });
    });

    describe('handleOAuthAuth', () => {
        it('debe procesar autenticación OAuth correctamente', async () => {
            const platform: Platform = 'twitch';
            const code = 'oauth-code-123';
            const codeVerifier = 'verifier-123';
            const userId = 'user123';
            const mockResponse: AuthResponse = {
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

            mockFlowProcessor.handleOAuthFlow = jest.fn().mockResolvedValue(mockResponse);

            const result = await authService.handleOAuthAuth(platform, code, codeVerifier, userId);

            expect(mockFlowProcessor.handleOAuthFlow).toHaveBeenCalledWith(platform, code, codeVerifier, userId);
            expect(result).toEqual(mockResponse);
        });

        it('debe procesar autenticación OAuth sin userId ni codeVerifier', async () => {
            const platform: Platform = 'youtube';
            const code = 'oauth-code-456';
            const mockResponse: AuthResponse = {
                user: {
                    id: 'newuser',
                    username: 'newuser',
                    displayName: 'New User',
                    avatar: 'https://example.com/avatar.png'
                } as UserDTO,
                token: 'jwt-token',
                connectionActive: true,
                activationReason: 'oauth_new_user'
            };

            mockFlowProcessor.handleOAuthFlow = jest.fn().mockResolvedValue(mockResponse);

            const result = await authService.handleOAuthAuth(platform, code);

            expect(mockFlowProcessor.handleOAuthFlow).toHaveBeenCalledWith(platform, code, undefined, undefined);
            expect(result).toEqual(mockResponse);
        });
    });

    describe('handleTikTokAuth', () => {
        it('debe procesar autenticación de TikTok correctamente', async () => {
            const username = 'tiktokuser';
            const userId = 'user123';
            const mockResponse: AuthResponse = {
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

            mockFlowProcessor.handleTikTokFlow = jest.fn().mockResolvedValue(mockResponse);

            const result = await authService.handleTikTokAuth(username, userId);

            expect(mockFlowProcessor.handleTikTokFlow).toHaveBeenCalledWith(username, userId);
            expect(result).toEqual(mockResponse);
        });
    });

    describe('getUserProfile', () => {
        it('debe obtener el perfil de usuario correctamente', async () => {
            const userId = 'user123';
            const mockProfile = {
                id: userId,
                username: 'testuser',
                displayName: 'Test User',
                connections: []
            };

            mockUserProfileService.getUserProfile = jest.fn().mockResolvedValue(mockProfile);

            const result = await authService.getUserProfile(userId);

            expect(mockUserProfileService.getUserProfile).toHaveBeenCalledWith(userId);
            expect(result).toEqual(mockProfile);
        });

        it('debe retornar null cuando el usuario no existe', async () => {
            const userId = 'nonexistent';
            mockUserProfileService.getUserProfile = jest.fn().mockResolvedValue(null);

            const result = await authService.getUserProfile(userId);

            expect(mockUserProfileService.getUserProfile).toHaveBeenCalledWith(userId);
            expect(result).toBeNull();
        });
    });

    describe('disconnectPlatform', () => {
        it('debe desconectar plataforma correctamente', async () => {
            const userId = 'user123';
            const platform: Platform = 'twitch';
            mockFlowProcessor.handleDisconnection = jest.fn().mockResolvedValue(undefined);

            await authService.disconnectPlatform(userId, platform);

            expect(mockFlowProcessor.handleDisconnection).toHaveBeenCalledWith(userId, platform);
        });
    });

    describe('logout', () => {
        it('debe procesar logout correctamente', async () => {
            const userId = 'user123';
            mockFlowProcessor.handleLogout = jest.fn().mockResolvedValue(undefined);

            await authService.logout(userId);

            expect(mockFlowProcessor.handleLogout).toHaveBeenCalledWith(userId);
        });

        it('debe manejar logout sin userId', async () => {
            mockFlowProcessor.handleLogout = jest.fn().mockResolvedValue(undefined);

            await authService.logout(undefined);

            expect(mockFlowProcessor.handleLogout).toHaveBeenCalledWith(undefined);
        });
    });
});
