import { User } from '../../models/User.model';
import { Connection } from '../../models/Connection.model';
import { PlatformProfile } from '../../types/index';
import { IUserRepository } from '../../repositories/interfaces/IUserRepository';
import { IConnectionRepository } from '../../repositories/interfaces/IConnectionRepository';
import { Transaction } from 'sequelize';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/AppError';
import crypto from 'crypto';
import { hashToken } from '../../utils/tokenUtils';
import { encryptionService } from '../security/EncryptionService';

/**
 * Servicio de Usuario - Maneja la lógica de negocio relacionada con usuarios
 */
export class UserService {
    constructor(
        private userRepository: IUserRepository,
        private connectionRepository: IConnectionRepository
    ) { }

    private decryptOverlayToken(user: User | null): User | null {
        if (user && user.overlayToken && encryptionService.isEncrypted(user.overlayToken)) {
            try {
                user.overlayToken = encryptionService.decrypt(user.overlayToken, `User:${user.id} overlayToken`);
            } catch (err) {
                logger.error({ err, userId: user.id }, 'Failed to decrypt overlayToken for user');
                user.overlayToken = '';
            }
        }
        return user;
    }

    async getById(id: string) {
        const user = await this.userRepository.findByIdWithConnections(id);
        return this.decryptOverlayToken(user);
    }

    async findByPlatformId(provider: string, providerId: string, transaction?: Transaction): Promise<User | null> {
        const connection = await this.connectionRepository.findByProvider(provider, providerId, transaction);
        if (!connection) return null;
        const user = await this.userRepository.findById(connection.userId, transaction);
        return this.decryptOverlayToken(user);
    }

    async findByEmail(email: string, transaction?: Transaction): Promise<User | null> {
        const user = await this.userRepository.findByEmail(email, transaction);
        return this.decryptOverlayToken(user);
    }

    async findOrCreateFromPlatform(
        profile: PlatformProfile,
        currentUserId?: string,
        transaction?: Transaction
    ): Promise<{ user: User, isNew: boolean, existingConnection?: Connection }> {
        // Primero buscamos si la conexión ya existe en la base de datos
        const existingConnection = await this.connectionRepository.findByProvider(profile.provider, profile.providerId, transaction);

        // Caso: El usuario ya está logueado e intenta vincular esta plataforma
        if (currentUserId) {
            // SEGURIDAD: Si la cuenta pertenece a OTRO usuario -> LANZAR ERROR
            if (existingConnection && String(existingConnection.userId) !== String(currentUserId)) {
                logger.warn({
                    currentUserId,
                    existingOwner: existingConnection.userId,
                    provider: profile.provider,
                    providerId: profile.providerId
                }, 'Intento de vinculación de cuenta ajena detectado');

                throw new AppError(`Esta cuenta de ${profile.provider} ya está vinculada a otro usuario.`, 409);
            }

            // Si es suya o no existe, procedemos con su cuenta actual
            const user = await this.userRepository.findByIdWithConnections(currentUserId, transaction);
            if (user) return { user, isNew: false, existingConnection: existingConnection || undefined };
        }

        // Caso: Login (el usuario no está logueado)
        if (existingConnection) {
            const user = await this.userRepository.findByIdWithConnections(existingConnection.userId, transaction);
            if (user) return { user, isNew: false, existingConnection: existingConnection || undefined };
        }

        if (profile.email) {
            const existingUserByEmail = await this.userRepository.findByEmail(profile.email, transaction);
            if (existingUserByEmail) {
                const userWithConns = await this.userRepository.findByIdWithConnections(existingUserByEmail.id, transaction);
                if (userWithConns) return { user: userWithConns, isNew: false };
            }
        }

        const user = await this.createFromProfile(profile, transaction);
        return { user, isNew: true };
    }

    private async createFromProfile(profile: PlatformProfile, transaction?: Transaction): Promise<User> {
        const baseUsername = profile.providerUsername.replace(/\s+/g, '').toLowerCase();
        let username = baseUsername;
        let suffix = 1;

        while (await this.userRepository.usernameExists(username, transaction)) {
            if (suffix > 10) {
                username = `${baseUsername}${Math.random().toString(36).substring(2, 7)}`;
                break;
            }
            username = `${baseUsername}${suffix++}`;
        }

        const rawToken = crypto.randomUUID();
        const encryptedToken = encryptionService.encrypt(rawToken);
        const tokenHash = hashToken(rawToken);

        return this.userRepository.create({
            username,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            email: profile.email,
            overlayToken: encryptedToken,
            overlayTokenHash: tokenHash
        }, transaction);
    }

    async updateProfileData(user: User, profile: Partial<PlatformProfile>, transaction?: Transaction) {
        const updates: Partial<{
            displayName: string;
            avatarUrl: string;
            email: string;
        }> = {};

        if (profile.displayName && user.displayName !== profile.displayName) updates.displayName = profile.displayName;
        if (profile.avatarUrl && user.avatarUrl !== profile.avatarUrl) updates.avatarUrl = profile.avatarUrl;
        if (profile.email && user.email !== profile.email) updates.email = profile.email;

        if (Object.keys(updates).length > 0) {
            await this.userRepository.update(user.id, updates, transaction);
            logger.debug({ userId: user.id }, 'Profile data updated');
        }
    }

    async regenerateOverlayToken(userId: string): Promise<string> {
        const rawToken = crypto.randomUUID();
        const encryptedToken = encryptionService.encrypt(rawToken);
        const tokenHash = hashToken(rawToken);

        await this.userRepository.update(userId, {
            overlayToken: encryptedToken,
            overlayTokenHash: tokenHash
        });

        return rawToken;
    }

    async findByOverlayToken(rawToken: string) {
        const tokenHash = hashToken(rawToken);
        const user = await this.userRepository.findByOverlayTokenHash(tokenHash);
        return this.decryptOverlayToken(user);
    }
}