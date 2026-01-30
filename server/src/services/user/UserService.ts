/** Servicio de gestión de usuarios con creación desde perfiles de plataformas */

import { User } from '../../models/User.model';
import { PlatformProfile } from '../../types/index';
import { IUserRepository } from '../../repositories/interfaces/IUserRepository';
import { IConnectionRepository } from '../../repositories/interfaces/IConnectionRepository';
import { Transaction } from 'sequelize';

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
            username = `${baseUsername}${suffix++}`;
        }

        return this.userRepository.create({
            username,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            email: profile.email
        }, transaction);
    }

    async updateAvatarAndDisplayName(user: User, profile: { avatarUrl: string, displayName: string }, transaction?: Transaction) {
        if (user.avatarUrl !== profile.avatarUrl || user.displayName !== profile.displayName) {
            await this.userRepository.update(user.id, {
                avatarUrl: profile.avatarUrl,
                displayName: profile.displayName
            }, transaction);
        }
    }
}
