import { TokenService } from './auth/TokenService';
import { PlatformServiceFactory } from './platforms/PlatformServiceFactory';
import { ProfileSyncService } from './auth/ProfileSyncService';
import { ConnectionCreationService } from './auth/ConnectionCreationService';
import { AuthInputValidator } from './auth/AuthInputValidator';
import { ConnectionActivationDecider, ConnectionActivationContext } from './auth/ConnectionActivationDecider';
import { AuthChatOrchestrator } from './auth/AuthChatOrchestrator';
import { AuthResponseBuilder } from './auth/AuthResponseBuilder';
import { TikTokProfileFactory } from './auth/TikTokProfileFactory';
import { TikTokTokenGenerator } from './auth/TikTokTokenGenerator';
import { UserProfileBuilder } from './auth/UserProfileBuilder';
import { ProfileSyncDecider, ProfileSyncContext } from './auth/ProfileSyncDecider';
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
    private inputValidator: AuthInputValidator;
    private activationDecider: ConnectionActivationDecider;
    private chatOrchestrator: AuthChatOrchestrator;
    private responseBuilder: AuthResponseBuilder;
    private tiktokProfileFactory: TikTokProfileFactory;
    private tiktokTokenGenerator: TikTokTokenGenerator;
    private userProfileBuilder: UserProfileBuilder;
    private profileSyncDecider: ProfileSyncDecider;

    constructor(
        userRepository: IUserRepository,
        connectionRepository: IConnectionRepository,
        chatManager: ChatManager
    ) {
        this.userService = new UserService(userRepository, connectionRepository);
        this.connectionService = new ConnectionService(connectionRepository);
        this.profileSyncService = new ProfileSyncService();
        this.connectionCreationService = new ConnectionCreationService();
        this.inputValidator = new AuthInputValidator();
        this.activationDecider = new ConnectionActivationDecider();
        this.chatOrchestrator = new AuthChatOrchestrator(chatManager);
        this.responseBuilder = new AuthResponseBuilder();
        this.tiktokProfileFactory = new TikTokProfileFactory();
        this.tiktokTokenGenerator = new TikTokTokenGenerator();
        this.userProfileBuilder = new UserProfileBuilder();
        this.profileSyncDecider = new ProfileSyncDecider();
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
                // 1. Validar entrada
                this.inputValidator.validateAuthorizationCode(code, platform);

                // 2. Obtener perfil y tokens de la plataforma
                const oauthService = PlatformServiceFactory.getService(platform);
                const { profile, tokens } = await oauthService.getProfileAndTokens(code, codeVerifier);

                // 3. Validar tokens recibidos
                this.inputValidator.validateOAuthTokens(tokens, platform);

                // 4. Procesar autenticación
                const authResult = await this.handlePlatformAuth(profile, tokens, currentUserId);

                // 5. Conectar chat si es necesario (sin bloquear autenticación)
                await this.chatOrchestrator.connectIfNeeded({
                    userId: authResult.user.id,
                    platform,
                    shouldConnect: authResult.connectionActive,
                    reason: authResult.activationReason
                });

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

        // 1. Validar y limpiar username
        const cleanUsername = this.inputValidator.validateTikTokUsername(username);

        // 2. Construir perfil de TikTok (Capa de Construcción de Datos)
        const profile = this.tiktokProfileFactory.createProfile(cleanUsername);

        // 3. Generar tokens placeholder (Capa de Infraestructura)
        const tokens = this.tiktokTokenGenerator.generatePlaceholderTokens(cleanUsername);

        // 4. Procesar autenticación
        const result = await this.handlePlatformAuth(profile, tokens, currentUserId);

        // 5. Conectar chat si es necesario
        await this.chatOrchestrator.connectIfNeeded({
            userId: result.user.id,
            platform: 'tiktok',
            shouldConnect: result.connectionActive,
            reason: result.activationReason
        });

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
                logger.info(
                    { provider: profile.provider, providerId: profile.providerId, currentUserId },
                    'Starting platform authentication'
                );

                // 1. Crear o encontrar usuario
                const { user, isNew } = await this.userService.findOrCreateFromPlatform(profile, currentUserId);
                logger.info({ userId: user.id, isNew }, 'User found or created');

                // 2. Verificar si existe conexión previa
                const existingConnection = await this.connectionService.getConnectionByProvider(
                    profile.provider,
                    profile.providerId
                );

                // 3. Decidir si activar conexión de streaming
                const activationContext: ConnectionActivationContext = {
                    isNewUser: isNew,
                    isLinkingAccount: !!currentUserId,
                    hasExistingConnection: !!existingConnection,
                    userId: user.id,
                    platform: profile.provider
                };

                const shouldActivate = this.activationDecider.shouldActivateConnection(activationContext);
                const activationReason = this.activationDecider.getActivationReason(activationContext);

                // 4. Crear o actualizar conexión si es necesario
                if (shouldActivate) {
                    await this.connectionCreationService.createOrUpdate(
                        user.id,
                        profile.provider,
                        tokens,
                        profile.providerId,
                        profile.providerUsername
                    );
                    logger.info(
                        { userId: user.id, platform: profile.provider, reason: activationReason },
                        'Connection activated'
                    );
                }

                // 5. Sincronizar perfil si es necesario (Capa de Lógica de Negocio)
                const syncContext: ProfileSyncContext = {
                    isNewUser: isNew,
                    isLinkingAccount: !!currentUserId,
                    provider: profile.provider,
                    userId: user.id
                };

                const shouldSyncProfile = this.profileSyncDecider.shouldSyncProfile(syncContext);
                if (shouldSyncProfile) {
                    await this.profileSyncService.syncProfile(user, profile);
                }

                logger.info({ userId: user.id, platform: profile.provider }, 'Platform authentication completed');

                // 6. Construir respuesta (Capa de Presentación)
                return this.responseBuilder.buildAuthResponse(user, shouldActivate, activationReason);
            },
            { action: 'handlePlatformAuth', provider: profile.provider },
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

        // Construir respuesta usando UserProfileBuilder (Capa de Presentación)
        return this.userProfileBuilder.buildUserProfile(user);
    }

    async disconnectPlatform(userId: string, provider: Platform) {
        logger.info({ userId, provider }, 'AuthService: Starting platform disconnection');

        // 1. Remover conexión de la base de datos
        const deletedCount = await this.connectionService.removeConnection(userId, provider);

        if (deletedCount === 0) {
            logger.warn({ userId, provider }, 'AuthService: No connection found to disconnect');
            throw new AppError('Connection not found', 404);
        }

        logger.info({ userId, provider, deletedCount }, 'AuthService: Connection removed from database');

        // 2. Desconectar chat (no bloquear si falla)
        await this.chatOrchestrator.disconnect(userId, provider);

        logger.info({ userId, provider }, 'AuthService: Platform disconnection completed');

        return true;
    }
}
