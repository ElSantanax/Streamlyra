/** Utilidades para transformación de datos de usuario */

import { User } from '../models/User.model';

export interface UserDTO {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    overlayToken?: string;
}

/**
 * Transforma una instancia de User en un DTO limpio para respuestas de API
 */
export function buildUserDTO(user: User): UserDTO {
    return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatarUrl,
        overlayToken: user.overlayToken
    };
}
