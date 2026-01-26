import { Connection } from '../../models/Connection.model';
import { IConnectionRepository } from '../interfaces/IConnectionRepository';
import { AuthTokens } from '../../types/index';
import { calculateTokenExpiry } from '../../utils/tokenUtils';

/**
 * Implementación del repositorio de conexiones usando Sequelize.
 * Encapsula toda la lógica de acceso a datos para conexiones OAuth.
 * 
 * NOTA: La lógica de renovación de tokens se ha movido a TokenRefreshService
 */
export class ConnectionRepository implements IConnectionRepository {
    /**
     * Encuentra una conexión por provider y providerId
     */
    async findByProvider(provider: string, providerId: string): Promise<Connection | null> {
        return Connection.findOne({
            where: { provider, providerId },
            include: ['user']
        }) as Promise<Connection | null>;
    }

    /**
     * Encuentra una conexión por userId y provider
     */
    async findByUserAndProvider(userId: string, provider: string): Promise<Connection | null> {
        return Connection.findOne({
            where: { userId: String(userId), provider }
        }) as Promise<Connection | null>;
    }

    /**
     * Encuentra todas las conexiones de un usuario
     */
    async findAllByUserId(userId: string): Promise<Connection[]> {
        return Connection.findAll({
            where: { userId: String(userId) }
        }) as Promise<Connection[]>;
    }

    /**
     * Crea o actualiza una conexión
     */
    async createOrUpdate(
        userId: string,
        provider: string,
        providerId: string,
        username: string,
        tokens: AuthTokens
    ): Promise<Connection> {
        let connection = await Connection.findOne({ where: { provider, providerId } });

        if (connection) {
            connection.accessToken = tokens.access_token;
            if (tokens.refresh_token) {
                connection.refreshToken = tokens.refresh_token;
            }
            connection.expiryDate = calculateTokenExpiry(tokens.expires_in);
            connection.providerUsername = username;
            await connection.save();
        } else {
            connection = await Connection.create({
                provider,
                providerId,
                providerUsername: username,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || '',
                expiryDate: calculateTokenExpiry(tokens.expires_in),
                userId
            });
        }
        return connection;
    }

    /**
     * Elimina una conexión por userId y provider
     */
    async removeByUserAndProvider(userId: string, provider: string): Promise<number> {
        return Connection.destroy({ where: { userId, provider } });
    }

    /**
     * Actualiza los tokens de una conexión
     */
    async updateTokens(connectionId: string, tokens: AuthTokens): Promise<Connection | null> {
        const connection = await Connection.findByPk(connectionId);
        if (!connection) return null;

        connection.accessToken = tokens.access_token;
        if (tokens.refresh_token) {
            connection.refreshToken = tokens.refresh_token;
        }
        connection.expiryDate = calculateTokenExpiry(tokens.expires_in);
        await connection.save();
        return connection;
    }


}
