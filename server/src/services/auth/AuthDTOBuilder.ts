/** Builder centralizado para DTOs de autenticación y perfil */

import { User } from '../../models/User.model';
import { buildUserDTO, UserDTO } from '../../utils/userUtils';
import { TokenService } from './TokenService';
import { Platform } from '../../constants/platforms';
import { ConnectionInfo, GlobalConnectionStatus } from '../../types';
import { StreamSessionManager } from '../core/StreamSessionManager';
import { ChatManager } from '../core/ChatManager';

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

export interface LastRaidDTO {
    name: string;
    platform: string;
    viewers: number;
    at: string;
}

export interface UserProfileResponse {
    user: UserDTO;
    connections: Record<string, ConnectionInfo>;
    lastFollower: LastFollowerDTO | null;
    lastRaid: LastRaidDTO | null;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export class AuthDTOBuilder {
    constructor(private chatManager: ChatManager) {}

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
                
                // Obtener estado detallado desde el ChatManager para esta plataforma
                const platformStatus = this.chatManager.getPlatformStatus(user.id, conn.provider as Platform);

                connections_map[conn.provider] = {
                    connected: true,
                    username: conn.providerUsername,
                    viewers: 0,
                    isLive: platformStatus?.isLive ?? isLive,
                    status: (platformStatus?.status as GlobalConnectionStatus) || (isLive ? 'connected' : 'waiting_stream'),
                    statusMessage: platformStatus?.message,
                    sessionStartTime: isLive ? session.startTime : null,
                    connectedAt: conn.createdAt ? conn.createdAt.toISOString() : undefined
                };
            });
        }

        // Resolver lastFollower desde las analíticas ya cargadas en el JOIN (sin query extra)
        let lastFollower: LastFollowerDTO | null = null;
        let lastRaid: LastRaidDTO | null = null;
        const analytics = user.analytics;

        if (analytics) {
            // Seguidor
            if (analytics.lastFollowerName && analytics.lastFollowerAt) {
                const elapsed = Date.now() - new Date(analytics.lastFollowerAt).getTime();
                if (elapsed <= SEVEN_DAYS_MS) {
                    lastFollower = {
                        name: analytics.lastFollowerName,
                        platform: analytics.lastFollowerPlatform,
                        at: new Date(analytics.lastFollowerAt).toISOString()
                    };
                }
            }

            // Raid
            if (analytics.lastRaidName && analytics.lastRaidAt) {
                const elapsed = Date.now() - new Date(analytics.lastRaidAt).getTime();
                if (elapsed <= SEVEN_DAYS_MS) {
                    lastRaid = {
                        name: analytics.lastRaidName,
                        platform: analytics.lastRaidPlatform,
                        viewers: analytics.lastRaidViewers || 0,
                        at: new Date(analytics.lastRaidAt).toISOString()
                    };
                }
            }
        }

        return {
            user: buildUserDTO(user),
            connections: connections_map,
            lastFollower,
            lastRaid
        };
    }
}
