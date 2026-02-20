import { Connection } from '../../models/Connection.model';
import { IConnectionRepository } from '../interfaces/IConnectionRepository';
import { AuthTokens } from '../../types/index';
import { calculateTokenExpiry } from '../../utils/tokenUtils';
import { Transaction } from 'sequelize';
import { WebhookCache } from '../../services/webhook/WebhookCache';
import { encryptionService } from '../../services/security/EncryptionService';
import { logger } from '../../utils/logger';

/**
 * Repositorio de conexiones con encriptación transparente y caché de tokens en memoria.
 */
export class ConnectionRepository implements IConnectionRepository {
    private encryptionService = encryptionService;
    private cache: WebhookCache;

    // Caché estática para evitar desencriptaciones costosas en un mismo ciclo de ejecución
    private static tokenCache = new Map<string, {
        accessToken: string,
        refreshToken: string | null,
    }>();

    constructor() {
        this.cache = WebhookCache.getInstance();
    }

    /**
     * Desencripta tokens y gestiona la auto-migración de datos legacy a formato encriptado.
     */
    private async decryptAndSyncConnection(connection: Connection | null, transaction?: Transaction): Promise<Connection | null> {
        if (!connection) return null;

        const cached = ConnectionRepository.tokenCache.get(connection.id);
        if (cached) {
            connection.accessToken = cached.accessToken;
            if (cached.refreshToken) connection.refreshToken = cached.refreshToken;
            return connection;
        }

        let needsUpdate = false;
        const context = `Connection:${connection.id} (${connection.provider})`;
        let plainAccessToken = connection.accessToken;
        let plainRefreshToken = connection.refreshToken;

        if (connection.accessToken) {
            if (!this.encryptionService.isEncrypted(connection.accessToken)) {
                needsUpdate = true;
                connection.accessToken = this.encryptionService.encrypt(plainAccessToken);
                logger.info({ context }, 'Auto-migrating legacy accessToken');
            } else {
                plainAccessToken = this.encryptionService.decrypt(connection.accessToken, context);
            }
        }

        if (connection.refreshToken) {
            if (!this.encryptionService.isEncrypted(connection.refreshToken)) {
                needsUpdate = true;
                connection.refreshToken = this.encryptionService.encrypt(plainRefreshToken);
                logger.info({ context }, 'Auto-migrating legacy refreshToken');
            } else {
                plainRefreshToken = this.encryptionService.decrypt(connection.refreshToken, context);
            }
        }

        if (needsUpdate) {
            try {
                await connection.save({ transaction });
            } catch (err) {
                logger.error({ err, context }, 'Failed to persist encrypted tokens');
                throw new Error("Failed to migrate tokens");
            }
        }

        ConnectionRepository.tokenCache.set(connection.id, {
            accessToken: plainAccessToken,
            refreshToken: plainRefreshToken
        });

        connection.accessToken = plainAccessToken;
        if (plainRefreshToken) connection.refreshToken = plainRefreshToken;

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

        const decrypted = await Promise.all(
            connections.map(conn => this.decryptAndSyncConnection(conn, transaction))
        );

        return decrypted.filter((conn): conn is Connection => conn !== null);
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

        const encryptedAccess = this.encryptionService.encrypt(tokens.access_token);
        const encryptedRefresh = tokens.refresh_token
            ? this.encryptionService.encrypt(tokens.refresh_token)
            : undefined;

        if (connection) {
            connection.userId = userId;
            connection.accessToken = encryptedAccess;
            if (encryptedRefresh) connection.refreshToken = encryptedRefresh;
            connection.expiryDate = calculateTokenExpiry(tokens.expires_in);
            connection.providerUsername = username;
            if (chatroomId !== undefined) connection.chatroomId = chatroomId;

            await connection.save({ transaction });
            ConnectionRepository.tokenCache.delete(connection.id);
        } else {
            connection = await Connection.create({
                provider,
                providerId,
                providerUsername: username,
                accessToken: encryptedAccess,
                refreshToken: encryptedRefresh || '',
                expiryDate: calculateTokenExpiry(tokens.expires_in),
                userId,
                chatroomId: chatroomId || null
            }, { transaction });
        }

        // Retornar instancia con tokens planos para uso inmediato
        connection.accessToken = tokens.access_token;
        if (tokens.refresh_token) connection.refreshToken = tokens.refresh_token;

        this.cache.invalidate(WebhookCache.keys.connection(provider, providerId));
        return connection;
    }

    async removeByUserAndProvider(userId: string, provider: string, transaction?: Transaction): Promise<number> {
        const connection = await Connection.findOne({ where: { userId, provider }, transaction });
        if (connection) {
            this.cache.invalidate(WebhookCache.keys.connection(provider, connection.providerId));
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
        ConnectionRepository.tokenCache.delete(connectionId);

        connection.accessToken = tokens.access_token;
        if (tokens.refresh_token) connection.refreshToken = tokens.refresh_token;

        return connection;
    }

    async clearTokens(connectionId: string, transaction?: Transaction): Promise<void> {
        const connection = await Connection.findByPk(connectionId, { transaction });
        if (!connection) return;

        connection.accessToken = '';
        connection.refreshToken = '';
        connection.expiryDate = null;
        await connection.save({ transaction });
        ConnectionRepository.tokenCache.delete(connectionId);
    }

    async updateChatroomId(userId: string, provider: string, chatroomId: string): Promise<void> {
        await Connection.update(
            { chatroomId },
            { where: { userId: String(userId), provider } }
        );
    }
}