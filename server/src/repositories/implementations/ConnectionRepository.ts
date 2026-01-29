import { Connection } from '../../models/Connection.model';
import { IConnectionRepository } from '../interfaces/IConnectionRepository';
import { AuthTokens } from '../../types/index';
import { calculateTokenExpiry } from '../../utils/tokenUtils';

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
    private decryptConnection(connection: Connection | null): Connection | null {
        if (!connection) return null;

        let needsUpdate = false;
        const context = `Connection:${connection.id} (${connection.provider})`;

        if (connection.accessToken) {
            if (!this.encryptionService.isEncrypted(connection.accessToken)) {
                needsUpdate = true;
                const plain = connection.accessToken;
                connection.accessToken = this.encryptionService.encrypt(plain);
                // Mantenemos el valor plano para el uso inmediato pero el objeto ya tiene el valor cifrado para persistir
                logger.info({ context }, 'Auto-migrating legacy accessToken to encrypted format');

                // Realizamos la desencriptación (que en este caso es identidad) con el logger
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
            // Guardamos la versión encriptada en la base de datos de forma asíncrona
            void connection.save().catch(err => {
                logger.error({ err, context }, 'Failed to persist auto-migrated encrypted tokens');
            });
        }

        return connection;
    }

    async findByProvider(provider: string, providerId: string): Promise<Connection | null> {
        const connection = await Connection.findOne({
            where: { provider, providerId },
            include: ['user']
        });
        return this.decryptConnection(connection);
    }

    async findByUserAndProvider(userId: string, provider: string): Promise<Connection | null> {
        const connection = await Connection.findOne({
            where: { userId: String(userId), provider }
        });
        return this.decryptConnection(connection);
    }

    async findAllByUserId(userId: string): Promise<Connection[]> {
        const connections = await Connection.findAll({
            where: { userId: String(userId) }
        });
        return connections.map(conn => this.decryptConnection(conn)!);
    }

    async createOrUpdate(
        userId: string,
        provider: string,
        providerId: string,
        username: string,
        tokens: AuthTokens
    ): Promise<Connection> {
        let connection = await Connection.findOne({ where: { provider, providerId } });

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
            await connection.save();
        } else {
            connection = await Connection.create({
                provider,
                providerId,
                providerUsername: username,
                accessToken: encryptedAccessToken,
                refreshToken: encryptedRefreshToken || '',
                expiryDate: calculateTokenExpiry(tokens.expires_in),
                userId
            });
        }

        // Retornar con tokens planos para que la aplicación los pueda usar inmediatamente
        // Esto modifica la instancia en memoria, pero ya se guardó encriptada en BD
        connection.accessToken = tokens.access_token;
        if (tokens.refresh_token) {
            connection.refreshToken = tokens.refresh_token;
        }

        return connection;
    }

    async removeByUserAndProvider(userId: string, provider: string): Promise<number> {
        return Connection.destroy({ where: { userId, provider } });
    }

    async updateTokens(connectionId: string, tokens: AuthTokens): Promise<Connection | null> {
        const connection = await Connection.findByPk(connectionId);
        if (!connection) return null;

        connection.accessToken = this.encryptionService.encrypt(tokens.access_token);
        if (tokens.refresh_token) {
            connection.refreshToken = this.encryptionService.encrypt(tokens.refresh_token);
        }
        connection.expiryDate = calculateTokenExpiry(tokens.expires_in);
        await connection.save();

        // Retornar desencriptado para uso inmediato
        connection.accessToken = tokens.access_token;
        if (tokens.refresh_token) {
            connection.refreshToken = tokens.refresh_token;
        }

        return connection;
    }
}
