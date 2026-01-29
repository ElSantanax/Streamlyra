/** Servicio de creación y actualización de conexiones de usuario con plataformas */

import { Platform } from '../../constants/platforms';
import { Connection } from '../../models/Connection.model';
import { AuthTokens } from '../../types/index';
import { logger } from '../../utils/logger';

export class ConnectionCreationService {
    async createOrUpdate(
        userId: string,
        platform: Platform,
        tokens: AuthTokens,
        providerId?: string,
        providerUsername?: string
    ): Promise<Connection> {
        try {
            logger.info({ userId, platform }, 'Creating or updating connection');

            let connection = await Connection.findOne({
                where: { userId: String(userId), provider: platform }
            });

            if (connection) {
                logger.info({ userId, platform }, 'Updating existing connection');
                await connection.update({
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)),
                    providerId: providerId || connection.providerId,
                    providerUsername: providerUsername || connection.providerUsername
                });
            } else {
                logger.info({ userId, platform }, 'Creating new connection');
                connection = await Connection.create({
                    userId: String(userId),
                    provider: platform,
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)),
                    providerId: providerId || '',
                    providerUsername: providerUsername || ''
                });
            }

            logger.info({ userId, platform }, 'Connection created or updated');
            return connection;
        } catch (error) {
            logger.error({ err: error, userId, platform }, 'Error creating or updating connection');
            throw error;
        }
    }
}
