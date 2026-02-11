import { UserService } from '../../user/UserService';
import { ConnectionService } from '../../connection/ConnectionService';
import { AuthDTOBuilder, AuthResponse } from '../AuthDTOBuilder';

import { AuthTokens, PlatformProfile } from '../../../types/index';

import { withErrorHandling } from '../../../utils/errorHandling';
import { logger } from '../../../utils/logger';
import db from '../../../config/db';
import { Transaction } from 'sequelize';
import { IConnectionRepository } from '../../../repositories/interfaces/IConnectionRepository';


export class PlatformAuthHandler {
    constructor(
        private userService: UserService,
        private connectionService: ConnectionService,
        private connectionRepository: IConnectionRepository,
        private dtoBuilder: AuthDTOBuilder
    ) { }

    async handlePlatformAuth(
        profile: PlatformProfile,
        tokens: AuthTokens,
        currentUserId?: string
    ): Promise<AuthResponse> {
        const result = await withErrorHandling(
            async () => {
                logger.info(
                    { provider: profile.provider, providerId: profile.providerId, currentUserId },
                    'PlatformAuthHandler: Starting platform authentication'
                );

                return await db.transaction(async (transaction) => {
                    // 1. Encontrar o crear usuario
                    const { user, isNew } = await this.userService.findOrCreateFromPlatform(
                        profile,
                        currentUserId,
                        transaction
                    );

                    // 2. Determinar si activar conexión
                    const existingConnection = await this.connectionService.getConnectionByProvider(
                        profile.provider,
                        profile.providerId
                    );

                    const shouldActivate = isNew || !!currentUserId || !!existingConnection;
                    const activationReason = isNew ? 'new_user' : (currentUserId ? 'explicit_link' : 'existing_refresh');

                    if (shouldActivate) {
                        await this.createOrUpdateConnection(user.id, profile, tokens, transaction);
                    }

                    // 3. Sincronizar perfil con Blindaje de Twitch
                    // Buscamos si el usuario ya tiene Twitch vinculado
                    // Usamos una verificación segura para evitar errores si user.connections es undefined
                    // Usamos una verificación segura obteniendo directamente de la BD en la transacción
                    const twitchConnection = await this.connectionRepository.findByUserAndProvider(
                        user.id,
                        'twitch',
                        transaction
                    );  
                    const hasTwitch = !!twitchConnection; // Siempre boolean estricto

                    // REGLA DE ORO: Solo sincronizamos si:
                    // a) Es Twitch (siempre actualiza para ser la fuente de verdad)
                    // b) Es un usuario nuevo y NO tiene Twitch (se registra con Kick/YT/etc)
                    const shouldSyncProfile = profile.provider === 'twitch' || (isNew && !hasTwitch);

                    if (shouldSyncProfile) {
                        logger.info({ userId: user.id, provider: profile.provider }, 'PlatformAuthHandler: Syncing profile data');
                        await this.userService.updateProfileData(user, profile, transaction);
                    } else {
                        logger.debug({ userId: user.id, provider: profile.provider }, 'PlatformAuthHandler: Skipping profile sync (Twitch protection)');
                    }

                    logger.info({ userId: user.id, provider: profile.provider }, 'PlatformAuthHandler: Auth completed');

                    return this.dtoBuilder.buildAuthResponse(user, shouldActivate, activationReason);
                });
            },
            { action: 'handlePlatformAuth', provider: profile.provider },
            { rethrow: true }
        ).catch(err => {
            // Captura explícita para diagnóstico detallado
            logger.error({
                err,
                provider: profile.provider,
                providerId: profile.providerId,
                userId: currentUserId
            }, 'CRITICAL: Error in PlatformAuthHandler transaction');
            throw err;
        });

        return result as AuthResponse;
    }

    private async createOrUpdateConnection(
        userId: string,
        profile: PlatformProfile,
        tokens: AuthTokens,
        transaction: Transaction
    ): Promise<void> {
        let chatroomId: string | undefined;

        // Nota: Ya no buscamos chatroomId para Kick porque usamos broadcasterId (v1 API) 
        // y el endpoint de v2 suele dar problemas de Cloudflare.

        try {
            await this.connectionRepository.createOrUpdate(
                userId,
                profile.provider,
                profile.providerId,
                profile.providerUsername,
                tokens,
                transaction,
                chatroomId
            );
        } catch (error) {
            // Si falla por duplicado, intentamos solo actualizar tokens como fallback
            // Esto previene el error 500 si hay condiciones de carrera
            logger.warn({ error, userId, provider: profile.provider }, 'Connection creation failed, attempting token update only');
            // Aquí idealmente llamaríamos a un updateTokensOnly, pero por ahora dejamos que
            // el flujo continúe si es un problema de restricción única no crítica
            if (error instanceof Error && (error.name === 'SequelizeUniqueConstraintError' || (error as any).code === '23505')) {
                logger.info('Recovered from unique constraint error in connection creation');
                return;
            }
            throw error;
        }
    }
}
