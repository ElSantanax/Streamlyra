/** Procesador central de flujos de autenticación y desconexión */

import { Platform } from '../../constants/platforms';
import { AuthTokens, PlatformProfile } from '../../types';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import { PlatformAuthHandler } from './core/PlatformAuthHandler';
import { ChatManager } from '../core/ChatManager';
import { AuthResponse } from './AuthDTOBuilder';
import { PlatformServiceFactory } from '../platforms/PlatformServiceFactory';
import { ConnectionService } from '../connection/ConnectionService';
import { StreamSessionManager } from '../core/StreamSessionManager';

export class AuthFlowProcessor {
    constructor(
        private platformAuthHandler: PlatformAuthHandler,
        private chatManager: ChatManager,
        private connectionService: ConnectionService
    ) { }

    async handleOAuthFlow(
        platform: Platform,
        code: string,
        codeVerifier?: string,
        currentUserId?: string
    ): Promise<AuthResponse> {
        if (!code) throw new AppError('Código requerido', 400);

        logger.info({ platform, currentUserId }, `Processing OAuth flow for ${platform}`);

        const oauthService = PlatformServiceFactory.getService(platform);
        const { profile, tokens } = await oauthService.getProfileAndTokens(code, codeVerifier);

        const result = await this.platformAuthHandler.handlePlatformAuth(profile, tokens, currentUserId);

        if (result.connectionActive) {
            // Iniciamos la conexión en segundo plano para no bloquear la respuesta HTTP
            void this.chatManager.connectProvider(result.user.id, platform);
        }

        return result;
    }

    async handleTikTokFlow(username: string, currentUserId?: string): Promise<AuthResponse> {
        if (!currentUserId) throw new AppError('Sesión requerida', 401);
        if (!username) throw new AppError('Usuario requerido', 400);

        const cleanUsername = username.trim().replace(/^@+/, '');

        if (cleanUsername.length < 2 || cleanUsername.length > 24) {
            throw new AppError('Longitud inválida (2-24)', 400);
        }

        const validUsernameRegex = /^[a-zA-Z0-9._]+$/;
        if (!validUsernameRegex.test(cleanUsername)) {
            throw new AppError('Caracteres inválidos', 400);
        }

        logger.info({ cleanUsername, currentUserId }, 'Processing TikTok flow');

        const profile: PlatformProfile = {
            provider: 'tiktok',
            providerId: `tiktok_${cleanUsername}`, // Placeholder
            providerUsername: cleanUsername,
            displayName: cleanUsername
        };

        const tokens: AuthTokens = {
            access_token: `tiktok_placeholder_${cleanUsername}_${Date.now()}`,
            expires_in: 365 * 24 * 60 * 60
        };

        const result = await this.platformAuthHandler.handlePlatformAuth(profile, tokens, currentUserId);

        if (result.connectionActive) {
            // Iniciamos la conexión en segundo plano para no bloquear la respuesta HTTP
            void this.chatManager.connectProvider(result.user.id, 'tiktok');
        }

        return result;
    }

    async handleDisconnection(userId: string, platform: Platform): Promise<void> {
        logger.info({ userId, platform }, 'Processing platform disconnection');

        await this.chatManager.disconnectProvider(userId, platform);
        await this.connectionService.removeConnection(userId, platform);

        logger.info({ userId, platform }, 'Platform disconnected successfully');
    }

    async handleLogout(userId: string | undefined): Promise<void> {
        if (!userId) return;
        logger.info({ userId }, 'Processing user logout (cleanup chats)');
        await this.chatManager.disconnectUser(userId);

        // Limpiar la sesión de stream para que el contador no persista
        StreamSessionManager.getInstance().clearSession(userId);
    }
}
