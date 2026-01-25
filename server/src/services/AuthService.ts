import { TokenService } from './auth/TokenService';
import { UserService } from './user/UserService';
import { ConnectionService } from './connection/ConnectionService';
import { ChatManager } from './ChatManager';

export interface PlatformProfile {
    provider: 'twitch' | 'youtube' | 'kick' | 'tiktok';
    providerId: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    email?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
}

export class AuthService {
    static async handlePlatformAuth(profile: PlatformProfile, tokens: AuthTokens, currentUserId?: string) {
        // 1. Identify if it's a known user (via Session, Connection or Email)
        const userByConn = await UserService.findByPlatformId(profile.provider, profile.providerId);
        const userByEmail = profile.email ? await UserService.findByEmail(profile.email) : null;

        const existingUser = currentUserId ? await UserService.getById(currentUserId) : (userByConn || userByEmail);
        const isNewRegistration = !existingUser;

        const user = existingUser || await UserService.findOrCreateFromPlatform(profile, currentUserId);

        // 2. Manage Connection
        await ConnectionService.createOrUpdateConnection(user.id, profile.provider, profile.providerId, profile.username, tokens);

        // 3. Sync profile ONLY if:
        // - It's a new registration (first time user enters the system)
        // - OR it's a LOGIN flow (not linking) AND the provider is 'twitch' (Identity Provider)
        const isLoginFlow = !currentUserId;
        if (isNewRegistration || (isLoginFlow && profile.provider === 'twitch')) {
            await UserService.updateAvatarAndDisplayName(user, profile);
        }

        return {
            token: TokenService.generateToken(user),
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatarUrl
            }
        };
    }

    static async getUserProfile(userId: string) {
        const user = await UserService.getById(userId);
        if (!user) return null;

        type ConnectionData = Record<string, { connected: boolean, username?: string }>;
        const defaultConnections: ConnectionData = {
            twitch: { connected: false },
            youtube: { connected: false },
            kick: { connected: false },
            tiktok: { connected: false }
        };

        user.connections.forEach(conn => {
            defaultConnections[conn.provider] = { connected: true, username: conn.providerUsername };
        });

        return {
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatarUrl
            },
            connections: defaultConnections
        };
    }

    static async disconnectPlatform(userId: string, provider: string, chatManager: ChatManager) {
        await ConnectionService.removeConnection(userId, provider);
        await chatManager.disconnectProvider(userId, provider as 'twitch' | 'youtube' | 'kick' | 'tiktok');
        return true;
    }
}
