/**
 * Constructor de Perfiles de Usuario
 * Responsabilidad: Construir respuestas de perfil de usuario (Capa de Presentación)
 * 
 * Transforma datos del modelo de usuario en DTOs de respuesta,
 * separando la transformación de datos de la lógica de negocio.
 */

import { User } from '../../models/User.model';
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
    /**
     * Construye la respuesta completa de perfil de usuario
     * @param user - Usuario del modelo (con conexiones cargadas)
     * @returns Respuesta de perfil formateada
     */
    buildUserProfile(user: User): UserProfileResponse {
        return {
            user: this.buildUserDTO(user),
            connections: this.buildConnectionsMap(user.connections)
        };
    }

    /**
     * Construye el DTO de usuario básico
     * @param user - Usuario del modelo
     * @returns DTO de usuario
     */
    private buildUserDTO(user: User) {
        return {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatarUrl
        };
    }

    /**
     * Construye el mapa de conexiones de plataformas
     * 
     * Crea un mapa con todas las plataformas soportadas,
     * marcando como conectadas solo las que el usuario tiene activas.
     * 
     * @param connections - Conexiones del usuario
     * @returns Mapa de conexiones por plataforma
     */
    private buildConnectionsMap(connections: any[]): ConnectionsMap {
        // Inicializar todas las plataformas como desconectadas
        const connectionsMap: ConnectionsMap = {
            twitch: { connected: false },
            youtube: { connected: false },
            kick: { connected: false },
            tiktok: { connected: false }
        };

        // Marcar como conectadas las plataformas activas
        connections.forEach(conn => {
            connectionsMap[conn.provider as Platform] = {
                connected: true,
                username: conn.providerUsername
            };
        });

        return connectionsMap;
    }
}
