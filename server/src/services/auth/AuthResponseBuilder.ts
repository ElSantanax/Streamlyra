/**
 * Constructor de Respuestas de Autenticación
 * Responsabilidad: Construir DTOs de respuesta de autenticación (Capa de Presentación)
 * 
 * Separa la construcción de respuestas de la lógica de negocio,
 * facilitando cambios en el formato sin afectar la lógica.
 */

import { TokenService } from './TokenService';
import { User } from '../../models/User.model';

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        username: string;
        displayName: string;
        avatar: string;
    };
    connectionActive: boolean;
    activationReason: string;
}

export class AuthResponseBuilder {
    /**
     * Construye la respuesta completa de autenticación
     * @param user - Usuario autenticado
     * @param connectionActive - Si la conexión de streaming está activa
     * @param activationReason - Razón de activación/no activación
     * @returns Respuesta de autenticación formateada
     */
    buildAuthResponse(
        user: User,
        connectionActive: boolean,
        activationReason: string
    ): AuthResponse {
        return {
            token: TokenService.generateToken(user),
            user: this.buildUserDTO(user),
            connectionActive,
            activationReason
        };
    }

    /**
     * Construye el DTO de usuario (sin información sensible)
     * @param user - Usuario del modelo
     * @returns DTO de usuario para respuesta
     */
    private buildUserDTO(user: User) {
        return {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatarUrl
        };
    }
}
