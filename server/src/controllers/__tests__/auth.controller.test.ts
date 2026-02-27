import { Response } from 'express';
import { AuthController } from '../auth.controller';
import { AuthService } from '../../services/auth/AuthService';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../utils/AppError';
import { Platform } from '../../constants/platforms';
import { UserDTO } from '../../utils/userUtils';
import { AuthResponse } from '../../services/auth/AuthDTOBuilder';
import { UserProfileResponse } from '../../services/auth/AuthDTOBuilder';

jest.mock('../../services/auth/AuthService');
jest.mock('crypto', () => ({
    randomBytes: jest.fn(() => ({
        toString: jest.fn(() => 'mock-csrf-token')
    }))
}));

describe('AuthController', () => {
    let authController: AuthController;
    let mockAuthService: jest.Mocked<AuthService>;
    let mockRequest: Partial<AuthRequest>;
    let mockResponse: Partial<Response>;
    let mockUserDTO: UserDTO;

    beforeEach(() => {
        mockAuthService = {
            handleOAuthAuth: jest.fn(),
            getUserProfile: jest.fn(),
            disconnectPlatform: jest.fn(),
            handleTikTokAuth: jest.fn(),
            logout: jest.fn(),
            regenerateOverlayToken: jest.fn(),
        } as unknown as jest.Mocked<AuthService>;

        authController = new AuthController(mockAuthService);

        mockUserDTO = {
            id: 'user-123',
            username: 'testuser',
            displayName: 'Test User',
            avatar: 'https://example.com/avatar.png'
        };

        mockRequest = {
            body: {},
            user: { id: 'user-123', username: 'testuser' }
        };

        mockResponse = {
            cookie: jest.fn().mockReturnThis(),
            clearCookie: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis(),
        };
    });

    describe('twitchAuth', () => {
        it('debe autenticar con Twitch cuando se proporciona código válido', async () => {
            const mockAuthResponse: AuthResponse = {
                token: 'mock-jwt-token',
                user: mockUserDTO,
                connectionActive: true,
                activationReason: 'oauth_login'
            };

            mockRequest.body = { code: 'twitch-auth-code', code_verifier: 'verifier' };
            mockAuthService.handleOAuthAuth.mockResolvedValue(mockAuthResponse);

            await authController.twitchAuth(mockRequest as AuthRequest, mockResponse as Response);

            expect(mockAuthService.handleOAuthAuth).toHaveBeenCalledWith(
                'twitch',
                'twitch-auth-code',
                'verifier',
                'user-123'
            );
            expect(mockResponse.cookie).toHaveBeenCalledWith('auth_token', 'mock-jwt-token', expect.any(Object));
        });

        it('no debe incluir el token en la respuesta JSON', async () => {
            const mockAuthResponse: AuthResponse = {
                token: 'secret-token',
                user: mockUserDTO,
                connectionActive: false,
                activationReason: 'new_user'
            };

            mockRequest.body = { code: 'code' };
            mockAuthService.handleOAuthAuth.mockResolvedValue(mockAuthResponse);

            await authController.twitchAuth(mockRequest as AuthRequest, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            const jsonMock = mockResponse.json as jest.Mock;
            expect(jsonMock.mock.calls).toHaveLength(1);
            const responseData = jsonMock.mock.calls[0] as unknown[];
            expect(responseData[0]).toEqual({
                user: mockUserDTO,
                connectionActive: false,
                activationReason: 'new_user'
            });
        });
    });

    describe('youtubeAuth', () => {
        it('debe autenticar con YouTube cuando se proporciona código válido', async () => {
            const mockAuthResponse: AuthResponse = {
                token: 'youtube-token',
                user: mockUserDTO,
                connectionActive: true,
                activationReason: 'oauth_login'
            };

            mockRequest.body = { code: 'youtube-code' };
            mockAuthService.handleOAuthAuth.mockResolvedValue(mockAuthResponse);

            await authController.youtubeAuth(mockRequest as AuthRequest, mockResponse as Response);

            expect(mockAuthService.handleOAuthAuth).toHaveBeenCalledWith(
                'youtube',
                'youtube-code',
                undefined,
                'user-123'
            );
            expect(mockResponse.cookie).toHaveBeenCalledWith('csrf_token', 'mock-csrf-token', expect.any(Object));
        });
    });

    describe('kickAuth', () => {
        it('debe autenticar con Kick cuando se proporciona código válido', async () => {
            const mockAuthResponse: AuthResponse = {
                token: 'kick-token',
                user: mockUserDTO,
                connectionActive: true,
                activationReason: 'oauth_login'
            };

            mockRequest.body = { code: 'kick-code' };
            mockAuthService.handleOAuthAuth.mockResolvedValue(mockAuthResponse);

            await authController.kickAuth(mockRequest as AuthRequest, mockResponse as Response);

            expect(mockAuthService.handleOAuthAuth).toHaveBeenCalledWith(
                'kick',
                'kick-code',
                undefined,
                'user-123'
            );
        });
    });

    describe('getMe', () => {
        it('debe retornar el perfil del usuario autenticado', async () => {
            const mockUserProfile: UserProfileResponse = {
                user: mockUserDTO,
                connections: {},
                lastFollower: null,
                lastRaid: null
            };

            mockAuthService.getUserProfile.mockResolvedValue(mockUserProfile);

            await authController.getMe(mockRequest as AuthRequest, mockResponse as Response);

            expect(mockAuthService.getUserProfile).toHaveBeenCalledWith('user-123');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('no-store'));
            expect(mockResponse.json).toHaveBeenCalledWith(mockUserProfile);
        });

        it('no debe permitir acceso sin usuario autenticado', async () => {
            mockRequest.user = undefined;

            await expect(
                authController.getMe(mockRequest as AuthRequest, mockResponse as Response)
            ).rejects.toThrow(AppError);
        });

        it('no debe retornar perfil cuando el usuario no existe', async () => {
            mockAuthService.getUserProfile.mockResolvedValue(null);

            await expect(
                authController.getMe(mockRequest as AuthRequest, mockResponse as Response)
            ).rejects.toThrow(new AppError('Usuario no encontrado', 404));
        });
    });

    describe('disconnectPlatform', () => {
        it('debe desconectar plataforma cuando el usuario está autenticado', async () => {
            mockRequest.body = { provider: 'twitch' as Platform };
            mockAuthService.disconnectPlatform.mockResolvedValue();

            await authController.disconnectPlatform(mockRequest as AuthRequest, mockResponse as Response);

            expect(mockAuthService.disconnectPlatform).toHaveBeenCalledWith('user-123', 'twitch');
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'twitch desconectado'
            });
        });

        it('no debe permitir desconectar sin autenticación', async () => {
            mockRequest.user = undefined;
            mockRequest.body = { provider: 'youtube' as Platform };

            await expect(
                authController.disconnectPlatform(mockRequest as AuthRequest, mockResponse as Response)
            ).rejects.toThrow(new AppError('No autorizado', 401));
        });
    });

    describe('tiktokAuth', () => {
        it('debe autenticar con TikTok usando username', async () => {
            const mockAuthResponse: AuthResponse = {
                token: 'tiktok-token',
                user: mockUserDTO,
                connectionActive: true,
                activationReason: 'tiktok_login'
            };

            mockRequest.body = { username: 'tiktokuser' };
            mockAuthService.handleTikTokAuth.mockResolvedValue(mockAuthResponse);

            await authController.tiktokAuth(mockRequest as AuthRequest, mockResponse as Response);

            expect(mockAuthService.handleTikTokAuth).toHaveBeenCalledWith('tiktokuser', 'user-123');
            expect(mockResponse.cookie).toHaveBeenCalledWith('auth_token', 'tiktok-token', expect.any(Object));
        });

        it('no debe permitir autenticación TikTok sin usuario', async () => {
            mockRequest.user = undefined;
            mockRequest.body = { username: 'tiktokuser' };

            await expect(
                authController.tiktokAuth(mockRequest as AuthRequest, mockResponse as Response)
            ).rejects.toThrow(new AppError('No autorizado', 401));
        });
    });

    describe('logout', () => {
        it('debe cerrar sesión y limpiar cookies', async () => {
            mockAuthService.logout.mockResolvedValue();

            await authController.logout(mockRequest as AuthRequest, mockResponse as Response);

            expect(mockAuthService.logout).toHaveBeenCalledWith('user-123');
            expect(mockResponse.clearCookie).toHaveBeenCalledWith('auth_token', expect.any(Object));
            expect(mockResponse.clearCookie).toHaveBeenCalledWith('csrf_token', expect.any(Object));
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Sesión cerrada exitosamente'
            });
        });
    });

    describe('regenerateOverlayToken', () => {
        it('debe regenerar el overlay token cuando el usuario está autenticado', async () => {
            const newToken = 'new-overlay-token-123';
            mockAuthService.regenerateOverlayToken.mockResolvedValue(newToken);

            await authController.regenerateOverlayToken(mockRequest as AuthRequest, mockResponse as Response);

            expect(mockAuthService.regenerateOverlayToken).toHaveBeenCalledWith('user-123');
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                overlayToken: newToken
            });
        });

        it('no debe regenerar token sin autenticación', async () => {
            mockRequest.user = undefined;

            await expect(
                authController.regenerateOverlayToken(mockRequest as AuthRequest, mockResponse as Response)
            ).rejects.toThrow(new AppError('No autorizado', 401));
        });
    });
});
