/** Builder centralizado para DTOs de autenticación y perfil */

import { User } from '../../models/User.model';
import { buildUserDTO, UserDTO } from '../../utils/userUtils';
import { TokenService } from './TokenService';
import { ConnectionInfo } from '../../types';
import { StreamSessionManager } from '../core/StreamSessionManager';

export interface AuthResponse {
    token: string;
    user: UserDTO;
    connectionActive: boolean;
    activationReason: string;
}

export interface LastFollowerDTO {
    name: string;
    platform: string;
    at: string;
}

export interface UserProfileResponse {
    user: UserDTO;
    connections: Record<string, ConnectionInfo>;
    lastFollower: LastFollowerDTO | null;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export class AuthDTOBuilder {
    buildAuthResponse(
        user: User,
        connectionActive: boolean,
        activationReason: string
    ): AuthResponse {
        return {
            token: TokenService.generateToken(user),
            user: buildUserDTO(user),
            connectionActive,
            activationReason
        };
    }

    buildUserProfile(user: User): UserProfileResponse {
        const connections_map: Record<string, ConnectionInfo> = {
            twitch: { connected: false, viewers: 0 },
            youtube: { connected: false, viewers: 0 },
            tiktok: { connected: false, viewers: 0 },
            kick: { connected: false, viewers: 0 }
        };

        if (user.connections) {
            const sessionManager = StreamSessionManager.getInstance();

            user.connections.forEach(conn => {
                const isLive = sessionManager.isPlatformLive(user.id, conn.provider);
                const session = sessionManager.getSession(user.id);

                connections_map[conn.provider] = {
                    connected: true,
                    username: conn.providerUsername,
                    viewers: 0,
                    isLive,
                    sessionStartTime: isLive ? session.startTime : null
                };
            });
        }

        // Resolver lastFollower desde las analíticas ya cargadas en el JOIN (sin query extra)
        let lastFollower: LastFollowerDTO | null = null;
        const analytics = user.analytics;
        if (analytics?.lastFollowerName && analytics?.lastFollowerAt) {
            const elapsed = Date.now() - new Date(analytics.lastFollowerAt).getTime();
            if (elapsed <= SEVEN_DAYS_MS) {
                lastFollower = {
                    name: analytics.lastFollowerName,
                    platform: analytics.lastFollowerPlatform,
                    at: new Date(analytics.lastFollowerAt).toISOString()
                };
            }
        }

        return {
            user: buildUserDTO(user),
            connections: connections_map,
            lastFollower
        };
    }
}
