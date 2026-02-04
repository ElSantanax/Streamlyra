/** Builder centralizado para DTOs de autenticación y perfil */

import { User } from '../../models/User.model';
import { buildUserDTO, UserDTO } from '../../utils/userUtils';
import { TokenService } from './TokenService';
import { ConnectionInfo } from '../../types';

export interface AuthResponse {
    token: string;
    user: UserDTO;
    connectionActive: boolean;
    activationReason: string;
}

export interface UserProfileResponse {
    user: UserDTO;
    connections: Record<string, ConnectionInfo>;
}

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
            user.connections.forEach(conn => {
                connections_map[conn.provider] = {
                    connected: true,
                    username: conn.providerUsername,
                    viewers: 0
                };
            });
        }

        return {
            user: buildUserDTO(user),
            connections: connections_map
        };
    }
}
