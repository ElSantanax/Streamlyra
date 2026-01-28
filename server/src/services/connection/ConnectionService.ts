import { IConnectionRepository } from '../../repositories/interfaces/IConnectionRepository';
import { TokenRefreshService } from './TokenRefreshService';
import { Platform } from '../../constants/platforms';
import { AuthTokens } from '../../types/index';
import { ConnectionRepository } from '../../repositories/implementations/ConnectionRepository';

export class ConnectionService {
    private tokenRefreshService: TokenRefreshService;

    constructor(private connectionRepository: IConnectionRepository) {
        this.tokenRefreshService = new TokenRefreshService(
            connectionRepository as ConnectionRepository
        );
    }

    async getConnectionByProvider(provider: string, providerId: string) {
        return this.connectionRepository.findByProvider(provider, providerId);
    }

    async getAllConnections(userId: string) {
        return this.connectionRepository.findAllByUserId(userId);
    }

    async createOrUpdateConnection(
        userId: string,
        provider: string,
        providerId: string,
        username: string,
        tokens: AuthTokens
    ) {
        return this.connectionRepository.createOrUpdate(userId, provider, providerId, username, tokens);
    }

    async removeConnection(userId: string, provider: string) {
        return this.connectionRepository.removeByUserAndProvider(userId, provider);
    }

    async getValidAccessToken(userId: string, platform: Platform): Promise<string | null> {
        return this.tokenRefreshService.getValidAccessToken(userId, platform);
    }

    /**
     * Fuerza la renovación de un token sin importar su fecha de expiración
     * Útil cuando una plataforma rechaza un token con error 401
     * 
     * @param userId - ID del usuario
     * @param platform - Plataforma (twitch, youtube, kick)
     * @returns Nuevo access token o null si falla
     */
    async forceTokenRefresh(userId: string, platform: Platform): Promise<string | null> {
        return this.tokenRefreshService.forceTokenRefresh(userId, platform);
    }
}
