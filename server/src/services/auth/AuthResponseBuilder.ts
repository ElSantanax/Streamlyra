/** Constructor de respuestas de autenticación para separar la construcción de DTOs de la lógica de negocio */

import { TokenService } from './TokenService';
import { User } from '../../models/User.model';
import { buildUserDTO, UserDTO } from '../../utils/userUtils';

export interface AuthResponse {
    token: string;
    user: UserDTO;
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
            user: buildUserDTO(user),
            connectionActive,
            activationReason
        };
    }
}
