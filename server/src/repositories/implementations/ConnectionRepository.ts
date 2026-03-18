import { Connection } from '../../models/Connection.model';
import { IConnectionRepository } from '../interfaces/IConnectionRepository';
import { AuthTokens } from '../../types/index';
import { calculateTokenExpiry } from '../../utils/tokenUtils';
import { Transaction } from 'sequelize';
import { encryptionService } from '../../services/security/EncryptionService';
import { logger } from '../../utils/logger';

const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
const TOKEN_CACHE_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

interface TokenCacheEntry {
    accessToken: string;
    refreshToken: string | null;
    expiry: number;
}

export class ConnectionRepository implements IConnectionRepository {
    private static tokenCache = new Map<string, TokenCacheEntry>();
    private static cleanupInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        if (!ConnectionRepository.cleanupInterval) {
            ConnectionRepository.cleanupInterval = setInterval(
                () => ConnectionRepository.evictExpiredTokens(),
                TOKEN_CACHE_CLEANUP_INTERVAL_MS
            );
        }
    }

    static stopCleanup(): void {
        if (ConnectionRepository.cleanupInterval) {
            clearInterval(ConnectionRepository.cleanupInterval);
            ConnectionRepository.cleanupInterval = null;
        }
    }

    private static evictExpiredTokens(): void {
        const now = Date.now();
        let evicted = 0;
        for (const [id, entry] of ConnectionRepository.tokenCache.entries()) {
            if (now > entry.expiry) {
                ConnectionRepository.tokenCache.delete(id);
                evicted++;
            }
        }
        if (evicted > 0) {
            logger.debug({ evicted }, 'TokenCache: entradas expiradas eliminadas');
        }
    }

    private async decryptAndSyncConnection(connection: Connection | null, transaction?: Transaction): Promise<Connection | null> {
        if (!connection) return null;

        const cached = ConnectionRepository.tokenCache.get(connection.id);
        if (cached) {
            if (Date.now() > cached.expiry) {
                ConnectionRepository.tokenCache.delete(connection.id);
            } else {
                connection.accessToken = cached.accessToken;
                if (cached.refreshToken) connection.refreshToken = cached.refreshToken;
                return connection;
            }
        }

        let needsUpdate = false;
        const context = `Connection:${connection.id} (${connection.provider})`;
        let plainAccessToken = connection.accessToken;
        let plainRefreshToken = connection.refreshToken;

        if (connection.accessToken) {
            if (!encryptionService.isEncrypted(connection.accessToken)) {
                needsUpdate = true;
                connection.accessToken = encryptionService.encrypt(plainAccessToken);
                logger.info({ context }, 'Auto-migrating legacy accessToken');
            } else {
                plainAccessToken = encryptionService.decrypt(connection.accessToken, context);
            }
        }

        if (connection.refreshToken) {
            if (!encryptionService.isEncrypted(connection.refreshToken)) {
                needsUpdate = true;
                connection.refreshToken = encryptionService.encrypt(plainRefreshToken);
                logger.info({ context }, 'Auto-migrating legacy refreshToken');
            } else {
                plainRefreshToken = encryptionService.decrypt(connection.refreshToken, context);
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
            refreshToken: plainRefreshToken,
            expiry: Date.now() + TOKEN_CACHE_TTL_MS
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

        const results = await Promise.allSettled(
            connections.map(conn => this.decryptAndSyncConnection(conn, transaction))
        );
        
        const decrypted = results
            .filter((result): result is PromiseFulfilledResult<Connection | null> => result.status === 'fulfilled')
            .map(result => result.value);

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

        const encryptedAccess = encryptionService.encrypt(tokens.access_token);
        const encryptedRefresh = tokens.refresh_token
            ? encryptionService.encrypt(tokens.refresh_token)
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

        // Invalidation removed
        return connection;
    }

    async removeByUserAndProvider(userId: string, provider: string, transaction?: Transaction): Promise<number> {
        const connection = await Connection.findOne({ where: { userId, provider }, transaction });
        if (connection) {
            ConnectionRepository.tokenCache.delete(connection.id);
        }
        return Connection.destroy({ where: { userId, provider }, transaction });
    }

    async updateTokens(connectionId: string, tokens: AuthTokens, transaction?: Transaction): Promise<Connection | null> {
        const connection = await Connection.findByPk(connectionId, { transaction });
        if (!connection) return null;

        connection.accessToken = encryptionService.encrypt(tokens.access_token);
        if (tokens.refresh_token) {
            connection.refreshToken = encryptionService.encrypt(tokens.refresh_token);
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