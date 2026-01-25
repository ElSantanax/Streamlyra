import { User } from '../../models/User.model';
import { Connection } from '../../models/Connection.model';
import { PlatformProfile } from '../AuthService';

export class UserService {
    static async getById(id: string) {
        return User.findByIdWithConnections(id);
    }

    static async findByPlatformId(provider: string, providerId: string): Promise<User | null> {
        const connection = await Connection.findOne({
            where: { provider, providerId }
        });
        if (!connection) return null;
        return User.findByPk(connection.userId);
    }

    static async findByEmail(email: string): Promise<User | null> {
        return User.findOne({ where: { email } });
    }

    static async findOrCreateFromPlatform(profile: PlatformProfile, currentUserId?: string): Promise<User> {
        // 1. If linking (already logged in)
        if (currentUserId) {
            const user = await User.findByPk(currentUserId);
            if (user) return user;
        }

        // 2. If login/re-auth: Search by existing connection
        const existingUserByConn = await this.findByPlatformId(profile.provider, profile.providerId);
        if (existingUserByConn) return existingUserByConn;

        // 3. Match by Email (Ghost User Prevention)
        if (profile.email) {
            const existingUserByEmail = await this.findByEmail(profile.email);
            if (existingUserByEmail) return existingUserByEmail;
        }

        // 4. New User Registration
        return this.createFromProfile(profile);
    }

    private static async createFromProfile(profile: PlatformProfile): Promise<User> {
        const baseUsername = profile.username.replace(/\s+/g, '').toLowerCase();
        let username = baseUsername;
        let suffix = 1;

        while (await User.findOne({ where: { username } })) {
            username = `${baseUsername}${suffix++}`;
        }

        return User.create({
            username,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            email: profile.email
        });
    }

    static async updateAvatarAndDisplayName(user: User, profile: { avatarUrl: string, displayName: string }) {
        if (user.avatarUrl !== profile.avatarUrl || user.displayName !== profile.displayName) {
            await user.update({ avatarUrl: profile.avatarUrl, displayName: profile.displayName });
        }
    }
}
