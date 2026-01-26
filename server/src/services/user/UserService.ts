import { User } from '../../models/User.model';
import { PlatformProfile } from '../../types/index';
import { IUserRepository } from '../../repositories/interfaces/IUserRepository';
import { IConnectionRepository } from '../../repositories/interfaces/IConnectionRepository';

export class UserService {
    constructor(
        private userRepository: IUserRepository,
        private connectionRepository: IConnectionRepository
    ) { }

    async getById(id: string) {
        return this.userRepository.findByIdWithConnections(id);
    }

    async findByPlatformId(provider: string, providerId: string): Promise<User | null> {
        const connection = await this.connectionRepository.findByProvider(provider, providerId);
        if (!connection) return null;
        return this.userRepository.findById(connection.userId);
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.userRepository.findByEmail(email);
    }

    async findOrCreateFromPlatform(profile: PlatformProfile, currentUserId?: string): Promise<{ user: User, isNew: boolean }> {
        // 1. If linking (already logged in)
        if (currentUserId) {
            const user = await this.userRepository.findById(currentUserId);
            if (user) return { user, isNew: false };
        }

        // 2. If login/re-auth: Search by existing connection
        const existingUserByConn = await this.findByPlatformId(profile.provider, profile.providerId);
        if (existingUserByConn) return { user: existingUserByConn, isNew: false };

        // 3. Match by Email (Ghost User Prevention)
        if (profile.email) {
            const existingUserByEmail = await this.findByEmail(profile.email);
            if (existingUserByEmail) return { user: existingUserByEmail, isNew: false };
        }

        // 4. New User Registration
        const user = await this.createFromProfile(profile);
        return { user, isNew: true };
    }

    private async createFromProfile(profile: PlatformProfile): Promise<User> {
        const baseUsername = profile.providerUsername.replace(/\s+/g, '').toLowerCase();
        let username = baseUsername;
        let suffix = 1;

        while (await this.userRepository.usernameExists(username)) {
            username = `${baseUsername}${suffix++}`;
        }

        return this.userRepository.create({
            username,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            email: profile.email
        });
    }

    async updateAvatarAndDisplayName(user: User, profile: { avatarUrl: string, displayName: string }) {
        if (user.avatarUrl !== profile.avatarUrl || user.displayName !== profile.displayName) {
            await this.userRepository.update(user.id, {
                avatarUrl: profile.avatarUrl,
                displayName: profile.displayName
            });
        }
    }
}
