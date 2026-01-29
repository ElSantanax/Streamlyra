/** Servicio de autenticación con OAuth y gestión de perfiles de usuario por plataforma */

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

    async handleOAuthAuth(
        platform: Platform,
        code: string,
        codeVerifier?: string,
        currentUserId?: string
    ) {
        const result = await withErrorHandling(
            async () => {
                this.inputValidator.validateAuthorizationCode(code, platform);

                const oauthService = PlatformServiceFactory.getService(platform);
                const { profile, tokens } = await oauthService.getProfileAndTokens(code, codeVerifier);

                this.inputValidator.validateOAuthTokens(tokens, platform);

                const authResult = await this.handlePlatformAuth(profile, tokens, currentUserId);

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

    async handleTikTokAuth(username: string, currentUserId?: string) {
        if (!currentUserId) {
            throw new AppError('TikTok authentication requires an authenticated user', 401);
        }

        const cleanUsername = this.inputValidator.validateTikTokUsername(username);

        const profile = this.tiktokProfileFactory.createProfile(cleanUsername);

        const tokens = this.tiktokTokenGenerator.generatePlaceholderTokens(cleanUsername);

        const result = await this.handlePlatformAuth(profile, tokens, currentUserId);

        await this.chatOrchestrator.connectIfNeeded({
            userId: result.user.id,
            platform: 'tiktok',
            shouldConnect: result.connectionActive,
            reason: result.activationReason
        });

        return result;
    }

    private async handlePlatformAuth(profile: PlatformProfile, tokens: AuthTokens, currentUserId?: string) {
        const result = await withErrorHandling(
            async () => {
                logger.info(
                    { provider: profile.provider, providerId: profile.providerId, currentUserId },
                    'Starting platform authentication'
                );

                const { user, isNew } = await this.userService.findOrCreateFromPlatform(profile, currentUserId);
                logger.info({ userId: user.id, isNew }, 'User found or created');

                const existingConnection = await this.connectionService.getConnectionByProvider(
                    profile.provider,
                    profile.providerId
                );

                const activationContext: ConnectionActivationContext = {
                    isNewUser: isNew,
                    isLinkingAccount: !!currentUserId,
                    hasExistingConnection: !!existingConnection,
                    userId: user.id,
                    platform: profile.provider
                };

                const shouldActivate = this.activationDecider.shouldActivateConnection(activationContext);
                const activationReason = this.activationDecider.getActivationReason(activationContext);

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

        return this.userProfileBuilder.buildUserProfile(user);
    }

    async disconnectPlatform(userId: string, provider: Platform) {
        logger.info({ userId, provider }, 'AuthService: Starting platform disconnection');

        const deletedCount = await this.connectionService.removeConnection(userId, provider);

        if (deletedCount === 0) {
            logger.warn({ userId, provider }, 'AuthService: No connection found to disconnect');
            throw new AppError('Connection not found', 404);
        }

        logger.info({ userId, provider, deletedCount }, 'AuthService: Connection removed from database');

        await this.chatOrchestrator.disconnect(userId, provider);

        logger.info({ userId, provider }, 'AuthService: Platform disconnection completed');

        return true;
    }
}
