import { TokenService } from './auth/TokenService';
import { PlatformServiceFactory } from './platforms/PlatformServiceFactory';
import { ProfileSyncService } from './auth/ProfileSyncService';
import { ConnectionCreationService } from './auth/ConnectionCreationService';
import { UserService } from './user/UserService';
import { ConnectionService } from './connection/ConnectionService';
import { ChatManager } from './ChatManager';
import { IUserRepository } from '../repositories/interfaces/IUserRepository';
import { IConnectionRepository } from '../repositories/interfaces/IConnectionRepository';
import { AuthTokens, PlatformProfile } from '../types/index';
import { Platform } from '../constants/platforms';
import { AppError } from '../utils/AppError';
import { withErrorHandling } from '../utils/errorHandling';
import { logger } from '../utils/logger';

export class AuthService {
    private userService: UserService;
    private connectionService: ConnectionService;
    private profileSyncService: ProfileSyncService;
    private connectionCreationService: ConnectionCreationService;

    constructor(
        userRepository: IUserRepository,
        connectionRepository: IConnectionRepository,
        private chatManager: ChatManager
    ) {
        this.userService = new UserService(userRepository, connectionRepository);
        this.connectionService = new ConnectionService(connectionRepository);
        this.profileSyncService = new ProfileSyncService();
        this.connectionCreationService = new ConnectionCreationService();
    }

    /**
     * Maneja autenticación OAuth para plataformas (Twitch, YouTube, Kick)
     * @param platform - Plataforma (twitch, youtube, kick)
     * @param code - Código de autorización
     * @param codeVerifier - Verificador de código (PKCE)
     * @param currentUserId - ID del usuario actual (si está vinculando)
     * @returns Token JWT y datos del usuario
     */
    async handleOAuthAuth(
        platform: Platform,
        code: string,
        codeVerifier?: string,
        currentUserId?: string
    ) {
        const result = await withErrorHandling(
            async () => {
                // Orquestar autenticación OAuth
                const oauthService = PlatformServiceFactory.getService(platform);
                const { profile, tokens } = await oauthService.getProfileAndTokens(code, codeVerifier);

                // Procesar autenticación
                const authResult = await this.handlePlatformAuth(profile, tokens, currentUserId);

                // Conectar chat SOLO si se activó/actualizó la conexión de streaming
                if (authResult.connectionActive) {
                    void this.chatManager.connectProvider(authResult.user.id, platform);
                }

                return authResult;
            },
            { platform, action: 'handleOAuthAuth' },
            { rethrow: true }
        );

        if (!result) {
            throw new AppError('OAuth authentication failed', 500);
        }

        return result;
    }

    /**
     * Maneja autenticación de TikTok (basada en username, sin OAuth)
     * @param username - Username de TikTok
     * @param currentUserId - ID del usuario actual
     * @returns Token JWT y datos del usuario
     */
    async handleTikTokAuth(username: string, currentUserId?: string) {
        if (!currentUserId) {
            throw new AppError('TikTok authentication requires an authenticated user', 401);
        }

        // Limpiar username (remover @ si existe)
        const cleanUsername = username.replace(/^@+/, '');

        // Construir perfil de TikTok
        const profile: PlatformProfile = {
            provider: 'tiktok',
            providerId: `tiktok_${cleanUsername}`,
            providerUsername: cleanUsername,
            displayName: cleanUsername,
            avatarUrl: ''
        };

        // TikTok no usa OAuth, tokens vacíos
        const tokens: AuthTokens = {
            access_token: '',
            expires_in: 0
        };

        // Procesar autenticación
        const result = await this.handlePlatformAuth(profile, tokens, currentUserId);

        // Conectar chat SOLO si la conexión está activa
        if (result.connectionActive) {
            void this.chatManager.connectProvider(result.user.id, 'tiktok');
        }

        return result;
    }

    /**
     * Procesa autenticación de plataforma (lógica común)
     * @param profile - Perfil de la plataforma
     * @param tokens - Tokens de acceso
     * @param currentUserId - ID del usuario actual (si está vinculando)
     * @returns Token JWT y datos del usuario
     */
    private async handlePlatformAuth(profile: PlatformProfile, tokens: AuthTokens, currentUserId?: string) {
        const result = await withErrorHandling(
            async () => {
                // 1. Create or Find User
                const { user, isNew } = await this.userService.findOrCreateFromPlatform(profile, currentUserId);

                // 2. Logic for Connection (Streaming Features)
                // We authenticate the user (Login), but we only enable 'Streaming Connection' if:
                // - It's a brand NEW registration (Auto-enable for convenience)
                // - User is explicitly LINKING accounts from dashboard (currentUserId exists)
                // - The connection ALREADY exists (Refresh tokens for active user)

                let connectionActive = false;
                const existingConnection = await this.connectionService.getConnectionByProvider(profile.provider, profile.providerId);
                const isExplicitLink = !!currentUserId;

                if (isNew || isExplicitLink || existingConnection) {
                    await this.connectionCreationService.createOrUpdate(
                        user.id,
                        profile.provider,
                        tokens,
                        profile.providerId,
                        profile.providerUsername
                    );
                    connectionActive = true;
                }

                // 3. Sync profile ONLY if:
                // - It's a new registration (first time user enters the system)
                // - OR it's a LOGIN flow (not linking) AND the provider is 'twitch' (Identity Provider)
                const isLoginFlow = !currentUserId;
                if (isNew || (isLoginFlow && profile.provider === 'twitch')) {
                    await this.profileSyncService.syncProfile(user, profile);
                }

                return {
                    token: TokenService.generateToken(user),
                    user: {
                        id: user.id,
                        username: user.username,
                        displayName: user.displayName,
                        avatar: user.avatarUrl
                    },
                    connectionActive // Return this internally to know if we should connect chat
                };
            },
            { action: 'handlePlatformAuth' },
            { rethrow: true }
        );

        if (!result) {
            throw new AppError('Platform authentication failed', 500);
        }

        return result;
    }

    async getUserProfile(userId: string) {
        const user = await this.userService.getById(userId);
        if (!user) return null;

        type ConnectionData = Record<string, { connected: boolean, username?: string }>;
        const defaultConnections: ConnectionData = {
            twitch: { connected: false },
            youtube: { connected: false },
            kick: { connected: false },
            tiktok: { connected: false }
        };

        user.connections.forEach(conn => {
            defaultConnections[conn.provider] = { connected: true, username: conn.providerUsername };
        });

        return {
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatarUrl
            },
            connections: defaultConnections
        };
    }

    async disconnectPlatform(userId: string, provider: Platform) {
        logger.info({ userId, provider }, 'AuthService: Starting platform disconnection');
        
        const deletedCount = await this.connectionService.removeConnection(userId, provider);
        logger.info({ userId, provider, deletedCount }, 'AuthService: Connection removed from database');
        
        await this.chatManager.disconnectProvider(userId, provider);
        logger.info({ userId, provider }, 'AuthService: Chat provider disconnected');
        
        return true;
    }
}
