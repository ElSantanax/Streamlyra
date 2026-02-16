import { Connection } from '../../models/Connection.model';
import { IConnectionRepository } from '../interfaces/IConnectionRepository';
import { AuthTokens } from '../../types/index';
import { calculateTokenExpiry } from '../../utils/tokenUtils';
import { Transaction } from 'sequelize';
import { WebhookCache } from '../../services/webhook/WebhookCache';

/**
 * Implementación del repositorio de conexiones usando Sequelize
 */
import { EncryptionService } from '../../services/security/EncryptionService';
import { logger } from '../../utils/logger';

/**
 * Implementación del repositorio de conexiones usando Sequelize
 * Aplica encriptación transparente a los tokens (Access y Refresh)
 */
export class ConnectionRepository implements IConnectionRepository {
    private encryptionService: EncryptionService;
    private cache: WebhookCache;

    // Caché estática compartida por todas las instancias del repositorio
    private static tokenCache = new Map<string, {
        accessToken: string,
        refreshToken: string | null,
    }>();

    constructor() {
        this.encryptionService = new EncryptionService();
        this.cache = WebhookCache.getInstance();
    }

    /**
     * Helper para desencriptar una conexión antes de retornarla
     * Implementa caché en memoria para evitar desencriptaciones repetitivas
     */
    private async decryptAndSyncConnection(connection: Connection | null, transaction?: Transaction): Promise<Connection | null> {
        if (!connection) return null;

        // Intentar obtener de la caché primero
        const cached = ConnectionRepository.tokenCache.get(connection.id);
        if (cached) {
            connection.accessToken = cached.accessToken;
            if (cached.refreshToken) {
                connection.refreshToken = cached.refreshToken;
            }
            return connection;
        }

        let needsUpdate = false;
        const context = `Connection:${connection.id} (${connection.provider})`;

        let plainAccessToken = connection.accessToken;
        let plainRefreshToken = connection.refreshToken;

        if (connection.accessToken) {
            if (!this.encryptionService.isEncrypted(connection.accessToken)) {
                needsUpdate = true;
                plainAccessToken = connection.accessToken;
                connection.accessToken = this.encryptionService.encrypt(plainAccessToken);
                logger.info({ context }, 'Auto-migrating legacy accessToken to encrypted format');
            } else {
                plainAccessToken = this.encryptionService.decrypt(connection.accessToken, context);
            }
        }

        if (connection.refreshToken) {
            if (!this.encryptionService.isEncrypted(connection.refreshToken)) {
                needsUpdate = true;
                plainRefreshToken = connection.refreshToken;
                connection.refreshToken = this.encryptionService.encrypt(plainRefreshToken);
                logger.info({ context }, 'Auto-migrating legacy refreshToken to encrypted format');
            } else {
                plainRefreshToken = this.encryptionService.decrypt(connection.refreshToken, context);
            }
        }

        if (needsUpdate) {
            try {
                await connection.save({ transaction });
            } catch (err) {
                logger.error({ err, context }, 'Failed to persist auto-migrated encrypted tokens');
                throw new Error("Failed to migrate encrypted tokens");
            }
        }

        // Guardar en caché para futuras consultas
        ConnectionRepository.tokenCache.set(connection.id, {
            accessToken: plainAccessToken,
            refreshToken: plainRefreshToken
        });

        // Restaurar tokens planos para uso inmediato
        connection.accessToken = plainAccessToken;
        if (plainRefreshToken) {
            connection.refreshToken = plainRefreshToken;
        }

        return connection;
    }

    async findByProvider(provider: string, providerId: string, transaction?: Transaction): Promise<Connection | null> {
        const connection = await Connection.findOne({
            where: { provider, providerId },
            include: ['user'],
            transaction
        });
        return this.decryptAndSyncConnection(connection, transaction);
    }

    async findByUserAndProvider(userId: string, provider: string, transaction?: Transaction): Promise<Connection | null> {
        const connection = await Connection.findOne({
            where: { userId: String(userId), provider },
            transaction
        });
        return this.decryptAndSyncConnection(connection, transaction);
    }

    async findAllByUserId(userId: string, transaction?: Transaction): Promise<Connection[]> {
        const connections = await Connection.findAll({
            where: { userId: String(userId) },
            transaction
        });

        const decryptedConnections = await Promise.all(
            connections.map(conn => this.decryptAndSyncConnection(conn, transaction))
        );

        return decryptedConnections.filter((conn): conn is Connection => conn !== null);
    }

    async createOrUpdate(
        userId: string,
        provider: string,
        providerId: string,
        username: string,
        tokens: AuthTokens,
        transaction?: Transaction,
        chatroomId?: string
    ): Promise<Connection> {
        let connection = await Connection.findOne({ where: { provider, providerId }, transaction });

        const encryptedAccessToken = this.encryptionService.encrypt(tokens.access_token);
        const encryptedRefreshToken = tokens.refresh_token
            ? this.encryptionService.encrypt(tokens.refresh_token)
            : undefined;

        if (connection) {
            connection.userId = userId;
            connection.accessToken = encryptedAccessToken;
            if (encryptedRefreshToken) {
                connection.refreshToken = encryptedRefreshToken;
            }
            connection.expiryDate = calculateTokenExpiry(tokens.expires_in);
            connection.providerUsername = username;
            if (chatroomId !== undefined) {
                connection.chatroomId = chatroomId;
            }
            await connection.save({ transaction });

            // Invalidar caché tras actualización
            ConnectionRepository.tokenCache.delete(connection.id);
        } else {
            connection = await Connection.create({
                provider,
                providerId,
                providerUsername: username,
                accessToken: encryptedAccessToken,
                refreshToken: encryptedRefreshToken || '',
                expiryDate: calculateTokenExpiry(tokens.expires_in),
                userId,
                chatroomId: chatroomId || null
            }, { transaction });
        }

        connection.accessToken = tokens.access_token;
        if (tokens.refresh_token) {
            connection.refreshToken = tokens.refresh_token;
        }

        this.cache.invalidate(WebhookCache.keys.connection(provider, providerId));

        return connection;
    }

    async removeByUserAndProvider(userId: string, provider: string, transaction?: Transaction): Promise<number> {
        const connection = await Connection.findOne({ where: { userId, provider }, transaction });
        if (connection) {
            this.cache.invalidate(WebhookCache.keys.connection(provider, connection.providerId));
            // Invalidar caché local
            ConnectionRepository.tokenCache.delete(connection.id);
        }

        return Connection.destroy({ where: { userId, provider }, transaction });
    }

    async updateTokens(connectionId: string, tokens: AuthTokens, transaction?: Transaction): Promise<Connection | null> {
        const connection = await Connection.findByPk(connectionId, { transaction });
        if (!connection) return null;

        connection.accessToken = this.encryptionService.encrypt(tokens.access_token);
        if (tokens.refresh_token) {
            connection.refreshToken = this.encryptionService.encrypt(tokens.refresh_token);
        }
        connection.expiryDate = calculateTokenExpiry(tokens.expires_in);
        await connection.save({ transaction });

        // Invalidar caché tras actualización
        ConnectionRepository.tokenCache.delete(connectionId);

        // Retornar desencriptado para uso inmediato
        connection.accessToken = tokens.access_token;
        if (tokens.refresh_token) {
            connection.refreshToken = tokens.refresh_token;
        }

        return connection;
    }

    async clearTokens(connectionId: string, transaction?: Transaction): Promise<void> {
        const connection = await Connection.findByPk(connectionId, { transaction });
        if (!connection) return;

        connection.accessToken = '';
        connection.refreshToken = '';
        connection.expiryDate = null;
        await connection.save({ transaction });

        // Invalidar caché tras actualización
        ConnectionRepository.tokenCache.delete(connectionId);
    }
}
