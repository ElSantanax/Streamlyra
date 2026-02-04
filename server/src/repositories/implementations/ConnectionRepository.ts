import { Connection } from '../../models/Connection.model';
import { IConnectionRepository } from '../interfaces/IConnectionRepository';
import { AuthTokens } from '../../types/index';
import { calculateTokenExpiry } from '../../utils/tokenUtils';
import { Transaction } from 'sequelize';

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

    constructor() {
        this.encryptionService = new EncryptionService();
    }

    /**
     * Helper para desencriptar una conexión antes de retornarla
     * Si detecta datos legacy (planos), los encripta y guarda automáticamente
     */
    private async decryptAndSyncConnection(connection: Connection | null, transaction?: Transaction): Promise<Connection | null> {
        if (!connection) return null;

        let needsUpdate = false;
        const context = `Connection:${connection.id} (${connection.provider})`;

        if (connection.accessToken) {
            if (!this.encryptionService.isEncrypted(connection.accessToken)) {
                needsUpdate = true;
                const plain = connection.accessToken;
                connection.accessToken = this.encryptionService.encrypt(plain);
                logger.info({ context }, 'Auto-migrating legacy accessToken to encrypted format');
                this.encryptionService.decrypt(plain, context);
            } else {
                connection.accessToken = this.encryptionService.decrypt(connection.accessToken, context);
            }
        }

        if (connection.refreshToken) {
            if (!this.encryptionService.isEncrypted(connection.refreshToken)) {
                needsUpdate = true;
                const plain = connection.refreshToken;
                connection.refreshToken = this.encryptionService.encrypt(plain);
                logger.info({ context }, 'Auto-migrating legacy refreshToken to encrypted format');
                this.encryptionService.decrypt(plain, context);
            } else {
                connection.refreshToken = this.encryptionService.decrypt(connection.refreshToken, context);
            }
        }

        if (needsUpdate) {
            try {
                await connection.save({ transaction });
            } catch (err) {
                logger.error({ err, context }, 'Failed to persist auto-migrated encrypted tokens');
            }
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

        // Encriptar tokens antes de guardar
        const encryptedAccessToken = this.encryptionService.encrypt(tokens.access_token);
        const encryptedRefreshToken = tokens.refresh_token
            ? this.encryptionService.encrypt(tokens.refresh_token)
            : undefined;

        if (connection) {
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

        // Retornar con tokens planos para que la aplicación los pueda usar inmediatamente
        // Esto modifica la instancia en memoria, pero ya se guardó encriptada en BD
        connection.accessToken = tokens.access_token;
        if (tokens.refresh_token) {
            connection.refreshToken = tokens.refresh_token;
        }

        return connection;
    }

    async removeByUserAndProvider(userId: string, provider: string, transaction?: Transaction): Promise<number> {
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

        // Retornar desencriptado para uso inmediato
        connection.accessToken = tokens.access_token;
        if (tokens.refresh_token) {
            connection.refreshToken = tokens.refresh_token;
        }

        return connection;
    }
}
