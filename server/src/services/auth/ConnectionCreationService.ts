/** Servicio de creación y actualización de conexiones de usuario con plataformas */

import { Platform } from '../../constants/platforms';
import { Connection } from '../../models/Connection.model';
import { AuthTokens } from '../../types/index';
import { IConnectionRepository } from '../../repositories/interfaces/IConnectionRepository';
import { logger } from '../../utils/logger';
import { Transaction } from 'sequelize';

export class ConnectionCreationService {
    constructor(private readonly connectionRepository: IConnectionRepository) { }

    async createOrUpdate(
        userId: string,
        platform: Platform,
        tokens: AuthTokens,
        providerId: string,
        providerUsername: string,
        transaction?: Transaction,
        chatroomId?: string
    ): Promise<Connection> {
        try {
            logger.info({ userId, platform }, 'Creating or updating connection via repository');

            return await this.connectionRepository.createOrUpdate(
                userId,
                platform,
                providerId,
                providerUsername,
                tokens,
                transaction,
                chatroomId
            );
        } catch (error) {
            logger.error({ err: error, userId, platform }, 'Error creating or updating connection');
            throw error;
        }
    }
}
