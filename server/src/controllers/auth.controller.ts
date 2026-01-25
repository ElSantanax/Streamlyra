import { Response } from 'express';
import { AuthService, PlatformProfile, AuthTokens } from '../services/AuthService';
import { TwitchService } from '../services/platforms/TwitchService';
import { YouTubeService } from '../services/platforms/YouTubeService';
import { KickService } from '../services/platforms/KickService';
import { AuthRequest } from '../middleware/auth.middleware';
import { ChatManager } from '../services/ChatManager';
import { ResponseHandler } from '../utils/response.utils';

// OAuth Service Registry
interface OAuthService {
    getProfileAndTokens(code: string, codeVerifier?: string): Promise<{ profile: PlatformProfile, tokens: AuthTokens }>;
}

const OAUTH_SERVICES: Record<string, OAuthService> = {
    twitch: TwitchService as OAuthService,
    youtube: YouTubeService as OAuthService,
    kick: KickService as OAuthService
};

// Generic OAuth handler factory
const createOAuthHandler = (serviceName: string) => async (req: AuthRequest, res: Response): Promise<void> => {
    const { code, code_verifier } = req.body as { code: string, code_verifier?: string };

    try {
        const service = OAUTH_SERVICES[serviceName];
        const { profile, tokens } = await service.getProfileAndTokens(code, code_verifier);
        const result = await AuthService.handlePlatformAuth(profile, tokens, req.user?.id);
        ResponseHandler.success(res, result);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error en autenticación';
        ResponseHandler.badRequest(res, message);
    }
};

export const twitchAuth = createOAuthHandler('twitch');
export const youtubeAuth = createOAuthHandler('youtube');
export const kickAuth = createOAuthHandler('kick');

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
        ResponseHandler.unauthorized(res);
        return;
    }

    try {
        const result = await AuthService.getUserProfile(req.user.id);
        if (!result) {
            ResponseHandler.notFound(res, 'Usuario no encontrado');
            return;
        }

        ResponseHandler.success(res, result);
    } catch (error: unknown) {
        ResponseHandler.error(res, 'Error al obtener perfil', 500, error);
    }
};

export const disconnectPlatform = (chatManager: ChatManager) => async (req: AuthRequest, res: Response): Promise<void> => {
    const { provider } = req.body as { provider: string };
    if (!req.user) {
        ResponseHandler.unauthorized(res);
        return;
    }

    try {
        await AuthService.disconnectPlatform(req.user.id, provider, chatManager);
        ResponseHandler.success(res, { success: true, message: `${provider} desconectado` });
    } catch (error: unknown) {
        ResponseHandler.error(res, 'Error al desconectar plataforma', 500, error);
    }
};

export const tiktokAuth = (chatManager: ChatManager) => async (req: AuthRequest, res: Response): Promise<void> => {
    const { username } = req.body as { username: string };
    if (!req.user) {
        ResponseHandler.unauthorized(res);
        return;
    }

    try {
        const cleanUsername = username.replace(/^@+/, '');
        const profile: PlatformProfile = {
            provider: 'tiktok',
            providerId: `tiktok_${cleanUsername}`,
            username: cleanUsername,
            displayName: cleanUsername,
            avatarUrl: ''
        };

        const result = await AuthService.handlePlatformAuth(profile, { accessToken: '', expiresIn: 0 }, req.user.id);
        void chatManager.connectProvider(req.user.id, 'tiktok');
        ResponseHandler.success(res, result);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error en TikTok auth';
        ResponseHandler.badRequest(res, message);
    }
};
