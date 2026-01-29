/** Constructor de perfiles de usuario para transformar datos del modelo en DTOs de respuesta */

import { User } from '../../models/User.model';
import { Connection } from '../../models/Connection.model';
import { Platform } from '../../constants/platforms';
import { buildUserDTO, UserDTO } from '../../utils/userUtils';

interface ConnectionData {
    connected: boolean;
    username?: string;
}

type ConnectionsMap = Record<Platform, ConnectionData>;

export interface UserProfileResponse {
    user: UserDTO;
    connections: ConnectionsMap;
}

export class UserProfileBuilder {
    buildUserProfile(user: User): UserProfileResponse {
        return {
            user: buildUserDTO(user),
            connections: this.buildConnectionsMap(user.connections)
        };
    }

    private buildConnectionsMap(connections: Connection[]): ConnectionsMap {
        const connectionsMap: ConnectionsMap = {
            twitch: { connected: false },
            youtube: { connected: false },
            kick: { connected: false },
            tiktok: { connected: false }
        };

        connections.forEach((conn) => {
            const provider = conn.provider as Platform;
            if (!provider || !connectionsMap[provider]) return;

            connectionsMap[provider] = {
                connected: true,
                username: conn.providerUsername || undefined
            };
        });

        return connectionsMap;
    }
}
