/** Constructor de perfiles de usuario para transformar datos del modelo en DTOs de respuesta */

import { User } from '../../models/User.model';
import { Connection } from '../../models/Connection.model';
import { Platform } from '../../constants/platforms';

interface ConnectionData {
    connected: boolean;
    username?: string;
}

type ConnectionsMap = Record<Platform, ConnectionData>;

export interface UserProfileResponse {
    user: {
        id: string;
        username: string;
        displayName: string;
        avatar: string;
    };
    connections: ConnectionsMap;
}

export class UserProfileBuilder {
    buildUserProfile(user: User): UserProfileResponse {
        return {
            user: this.buildUserDTO(user),
            connections: this.buildConnectionsMap(user.connections)
        };
    }

    private buildUserDTO(user: User) {
        return {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatarUrl
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
