import { Connection } from '../../models/Connection.model';
import { AuthTokens } from '../../types/index';

/**
 * Interfaz que define las operaciones disponibles para el repositorio de conexiones.
 * Los servicios solo conocen esta interfaz, no la implementación con Sequelize.
 */
export interface IConnectionRepository {
    /**
     * Encuentra una conexión por provider y providerId
     */
    findByProvider(provider: string, providerId: string): Promise<Connection | null>;

    /**
     * Encuentra una conexión por userId y provider
     */
    findByUserAndProvider(userId: string, provider: string): Promise<Connection | null>;

    /**
     * Encuentra todas las conexiones de un usuario
     */
    findAllByUserId(userId: string): Promise<Connection[]>;

    /**
     * Crea o actualiza una conexión
     */
    createOrUpdate(
        userId: string,
        provider: string,
        providerId: string,
        username: string,
        tokens: AuthTokens
    ): Promise<Connection>;

    /**
     * Elimina una conexión por userId y provider
     */
    removeByUserAndProvider(userId: string, provider: string): Promise<number>;

    /**
     * Actualiza los tokens de una conexión
     */
    updateTokens(connectionId: string, tokens: AuthTokens): Promise<Connection | null>;
}
