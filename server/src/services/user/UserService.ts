/** Servicio de gestión de usuarios con creación desde perfiles de plataformas */

import { User } from '../../models/User.model';
import { PlatformProfile } from '../../types/index';
import { IUserRepository } from '../../repositories/interfaces/IUserRepository';
import { IConnectionRepository } from '../../repositories/interfaces/IConnectionRepository';
import { Transaction } from 'sequelize';
import { logger } from '../../utils/logger';

export class UserService {
    constructor(
        private userRepository: IUserRepository,
        private connectionRepository: IConnectionRepository
    ) { }

    async getById(id: string) {
        return this.userRepository.findByIdWithConnections(id);
    }

    async findByPlatformId(provider: string, providerId: string, transaction?: Transaction): Promise<User | null> {
        const connection = await this.connectionRepository.findByProvider(provider, providerId, transaction);
        if (!connection) return null;
        return this.userRepository.findById(connection.userId, transaction);
    }

    async findByEmail(email: string, transaction?: Transaction): Promise<User | null> {
        return this.userRepository.findByEmail(email, transaction);
    }

    async findOrCreateFromPlatform(
        profile: PlatformProfile,
        currentUserId?: string,
        transaction?: Transaction
    ): Promise<{ user: User, isNew: boolean }> {
        if (currentUserId) {
            const user = await this.userRepository.findById(currentUserId, transaction);
            if (user) return { user, isNew: false };
        }

        const existingUserByConn = await this.findByPlatformId(profile.provider, profile.providerId, transaction);
        if (existingUserByConn) return { user: existingUserByConn, isNew: false };

        if (profile.email) {
            const existingUserByEmail = await this.findByEmail(profile.email, transaction);
            if (existingUserByEmail) return { user: existingUserByEmail, isNew: false };
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
                // Si después de 10 intentos no hay suerte, usar un fragmento aleatorio para romper el bucle
                username = `${baseUsername}${Math.random().toString(36).substring(2, 7)}`;
                break;
            }
            username = `${baseUsername}${suffix++}`;
        }

        return this.userRepository.create({
            username,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            email: profile.email
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
}
