import { Connection } from '../../models/Connection.model';
import { AuthTokens } from '../../types/index';
import { Transaction } from 'sequelize';

/**
 * Interfaz que define las operaciones del repositorio de conexiones
 */
export interface IConnectionRepository {
    findByProvider(provider: string, providerId: string, transaction?: Transaction): Promise<Connection | null>;

    findByUserAndProvider(userId: string, provider: string, transaction?: Transaction): Promise<Connection | null>;

    findAllByUserId(userId: string, transaction?: Transaction): Promise<Connection[]>;

    createOrUpdate(
        userId: string,
        provider: string,
        providerId: string,
        username: string,
        tokens: AuthTokens,
        transaction?: Transaction,
        chatroomId?: string
    ): Promise<Connection>;

    removeByUserAndProvider(userId: string, provider: string, transaction?: Transaction): Promise<number>;

    updateTokens(connectionId: string, tokens: AuthTokens, transaction?: Transaction): Promise<Connection | null>;
}
