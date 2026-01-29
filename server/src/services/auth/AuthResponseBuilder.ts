/** Constructor de respuestas de autenticación para separar la construcción de DTOs de la lógica de negocio */

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

    private buildUserDTO(user: User) {
        return {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatarUrl
        };
    }
}
