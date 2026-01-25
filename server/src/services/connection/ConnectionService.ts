import { Connection } from '../../models/Connection.model';
import { AuthTokens } from '../AuthService';
import { TwitchService } from '../platforms/TwitchService';
import { YouTubeService } from '../platforms/YouTubeService';
import { KickService } from '../platforms/KickService';

type PlatformProvider = 'twitch' | 'youtube' | 'kick' | 'tiktok';

const REFRESH_SERVICES = {
    twitch: TwitchService,
    youtube: YouTubeService,
    kick: KickService
} as const;

export class ConnectionService {
    static async getConnectionByProvider(provider: string, providerId: string) {
        return Connection.findOne({
            where: { provider, providerId },
            include: ['user'] // Assuming association name is 'user'
        });
    }

    static async createOrUpdateConnection(userId: string, provider: string, providerId: string, username: string, tokens: AuthTokens) {
        let connection = await Connection.findOne({ where: { provider, providerId } });

        if (connection) {
            this.updateTokens(connection, tokens, username);
            await connection.save();
        } else {
            connection = await Connection.create({
                provider,
                providerId,
                providerUsername: username,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken || '',
                expiryDate: this.calculateExpiry(tokens.expiresIn),
                userId
            });
        }
        return connection;
    }

    static async removeConnection(userId: string, provider: string) {
        return Connection.removeConnection(userId, provider);
    }

    private static updateTokens(connection: Connection, tokens: AuthTokens, username?: string): void {
        connection.accessToken = tokens.accessToken;
        if (tokens.refreshToken) connection.refreshToken = tokens.refreshToken;
        connection.expiryDate = this.calculateExpiry(tokens.expiresIn);
        if (username) connection.providerUsername = username;
    }

    private static calculateExpiry(expiresIn: number): Date {
        return new Date(Date.now() + expiresIn * 1000);
    }

    static async getValidAccessToken(userId: string, provider: PlatformProvider): Promise<string | null> {
        const connection = await Connection.findOne({ where: { userId: String(userId), provider } });
        if (!connection) return null;

        if (provider === 'tiktok') return connection.accessToken;

        const bufferTime = 5 * 60 * 1000;
        if (connection.expiryDate && (connection.expiryDate.getTime() - Date.now() > bufferTime)) {
            return connection.accessToken;
        }

        if (!connection.refreshToken) return connection.accessToken;

        try {
            const Service = REFRESH_SERVICES[provider as Exclude<PlatformProvider, 'tiktok'>];
            const tokens = await Service.refreshAccessToken(connection.refreshToken);
            this.updateTokens(connection, tokens);
            await connection.save();
            return connection.accessToken;
        } catch (error) {
            console.error(`[ConnectionService] Error refreshing token for ${provider}:`, error);
            return connection.accessToken;
        }
    }
}
