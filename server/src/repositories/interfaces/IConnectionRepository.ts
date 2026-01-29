import { Connection } from '../../models/Connection.model';
import { AuthTokens } from '../../types/index';

/**
 * Interfaz que define las operaciones del repositorio de conexiones
 */
export interface IConnectionRepository {
    findByProvider(provider: string, providerId: string): Promise<Connection | null>;

    findByUserAndProvider(userId: string, provider: string): Promise<Connection | null>;

    findAllByUserId(userId: string): Promise<Connection[]>;

    createOrUpdate(
        userId: string,
        provider: string,
        providerId: string,
        username: string,
        tokens: AuthTokens
    ): Promise<Connection>;

    removeByUserAndProvider(userId: string, provider: string): Promise<number>;

    updateTokens(connectionId: string, tokens: AuthTokens): Promise<Connection | null>;
}
