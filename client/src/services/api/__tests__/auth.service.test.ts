import { authService } from '../auth.service';
import { apiClient } from '../client';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../client', () => ({
    apiClient: {
        post: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
    }
}));

vi.mock('../../../config/endpoints', () => ({
    endpoints: {
        auth: {
            twitch: '/auth/twitch',
            youtube: '/auth/youtube',
            kick: '/auth/kick',
            me: '/auth/me',
            tiktok: '/auth/tiktok',
            platform: '/auth/platform',
            logout: '/auth/logout',
            regenerateOverlayToken: '/auth/regenerate-overlay',
        }
    }
}));

describe('authService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debería intercambiar el código para twitch sin codeVerifier', async () => {
        const mockResponse = { user: { id: 1 }, access_token: 'token' };
        vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

        const response = await authService.exchangeCode('twitch', 'test-code');

        expect(apiClient.post).toHaveBeenCalledWith('/auth/twitch', { code: 'test-code' }, true);
        expect(response).toEqual(mockResponse);
    });

    it('debería intercambiar el código para kick con codeVerifier', async () => {
        const mockResponse = { user: { id: 1 }, access_token: 'token' };
        vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

        const response = await authService.exchangeCode('kick', 'test-code', 'verifier-123');

        expect(apiClient.post).toHaveBeenCalledWith('/auth/kick', { code: 'test-code', code_verifier: 'verifier-123' }, true);
        expect(response).toEqual(mockResponse);
    });

    it('debería obtener la información del usuario actual con getMe', async () => {
        const mockMe = { user: { id: 1, email: 'test@test.com' } };
        vi.mocked(apiClient.get).mockResolvedValue(mockMe);

        const response = await authService.getMe();

        // Important: false ensures 401s do not force global redirection
        expect(apiClient.get).toHaveBeenCalledWith('/auth/me', false);
        expect(response).toEqual(mockMe);
    });

    it('debería conectar la cuenta de TikTok con el username', async () => {
        const mockResponse = { success: true };
        vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

        const response = await authService.connectTikTok('cool_user');

        expect(apiClient.post).toHaveBeenCalledWith('/auth/tiktok', { username: 'cool_user' }, true);
        expect(response).toEqual(mockResponse);
    });

    it('debería desconectar una plataforma', async () => {
        vi.mocked(apiClient.delete).mockResolvedValue({});

        await authService.disconnectPlatform('twitch');

        expect(apiClient.delete).toHaveBeenCalledWith('/auth/platform', { provider: 'twitch' }, true);
    });

    it('debería cerrar sesión del usuario', async () => {
        vi.mocked(apiClient.post).mockResolvedValue({});

        await authService.logout();

        expect(apiClient.post).toHaveBeenCalledWith('/auth/logout', {}, true);
    });

    it('debería regenerar el token de overlay', async () => {
        const mockRes = { overlayToken: 'new-token' };
        vi.mocked(apiClient.post).mockResolvedValue(mockRes);

        const response = await authService.regenerateOverlayToken();

        expect(apiClient.post).toHaveBeenCalledWith('/auth/regenerate-overlay', {}, true);
        expect(response).toEqual(mockRes);
    });
});
