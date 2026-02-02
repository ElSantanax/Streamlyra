/** Manejador central de autenticación de plataforma con lógica transaccional */

import { UserService } from '../../user/UserService';
import { ConnectionService } from '../../connection/ConnectionService';
import { ProfileSyncService } from '../ProfileSyncService';
import { ConnectionCreationService } from '../ConnectionCreationService';
import { ConnectionActivationDecider, ConnectionActivationContext } from '../ConnectionActivationDecider';
import { ProfileSyncDecider, ProfileSyncContext } from '../ProfileSyncDecider';
import { AuthResponseBuilder, AuthResponse } from '../AuthResponseBuilder';
import { KickService } from '../../platforms/KickService';
import { AuthTokens, PlatformProfile } from '../../../types/index';
import { AppError } from '../../../utils/AppError';
import { withErrorHandling } from '../../../utils/errorHandling';
import { logger } from '../../../utils/logger';
import db from '../../../config/db';
import { Transaction } from 'sequelize';

export class PlatformAuthHandler {
    constructor(
        private userService: UserService,
        private connectionService: ConnectionService,
        private profileSyncService: ProfileSyncService,
        private connectionCreationService: ConnectionCreationService,
        private activationDecider: ConnectionActivationDecider,
        private profileSyncDecider: ProfileSyncDecider,
        private responseBuilder: AuthResponseBuilder
    ) {}

    async handlePlatformAuth(
        profile: PlatformProfile,
        tokens: AuthTokens,
        currentUserId?: string
    ): Promise<AuthResponse> {
        const result = await withErrorHandling(
            async () => {
                logger.info(
                    { provider: profile.provider, providerId: profile.providerId, currentUserId },
                    'PlatformAuthHandler: Starting platform authentication with transaction'
                );

                return await db.transaction(async (transaction) => {
                    const { user, isNew } = await this.userService.findOrCreateFromPlatform(
                        profile,
                        currentUserId,
                        transaction
                    );
                    logger.info({ userId: user.id, isNew }, 'PlatformAuthHandler: User found or created');

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
                        await this.createOrUpdateConnection(
                            user.id,
                            profile,
                            tokens,
                            transaction
                        );
                        logger.info(
                            { userId: user.id, platform: profile.provider, reason: activationReason },
                            'PlatformAuthHandler: Connection activated'
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
                        await this.profileSyncService.syncProfile(user, profile, transaction);
                    }

                    logger.info(
                        { userId: user.id, platform: profile.provider },
                        'PlatformAuthHandler: Platform authentication completed successfully'
                    );

                    return this.responseBuilder.buildAuthResponse(user, shouldActivate, activationReason);
                });
            },
            { action: 'handlePlatformAuth', provider: profile.provider },
            { rethrow: true }
        );

        if (!result) {
            throw new AppError('Platform authentication failed', 500);
        }

        return result;
    }

    private async createOrUpdateConnection(
        userId: string,
        profile: PlatformProfile,
        tokens: AuthTokens,
        transaction: Transaction
    ): Promise<void> {
        let chatroomId: string | undefined;

        // Obtener chatroomId para Kick
        if (profile.provider === 'kick') {
            try {
                const channelDetails = await KickService.getChannelDetails(
                    profile.providerUsername,
                    tokens.access_token
                );
                chatroomId = channelDetails.chatroom?.id?.toString();
                logger.info(
                    { userId, chatroomId },
                    'PlatformAuthHandler: Kick chatroomId obtained'
                );
            } catch (error) {
                logger.warn(
                    { err: error, userId },
                    'PlatformAuthHandler: Could not obtain Kick chatroomId, will continue without it'
                );
            }
        }

        await this.connectionCreationService.createOrUpdate(
            userId,
            profile.provider,
            tokens,
            profile.providerId,
            profile.providerUsername,
            transaction,
            chatroomId
        );
    }
}
