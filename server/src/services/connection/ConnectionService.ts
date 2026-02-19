/** Servicio de gestión de conexiones de usuarios con plataformas y renovación de tokens */

import { IConnectionRepository } from '../../repositories/interfaces/IConnectionRepository';
import { TokenRefreshService } from './TokenRefreshService';
import { Platform } from '../../constants/platforms';
import { AuthTokens } from '../../types/index';
import { Connection } from '../../models/Connection.model';

export class ConnectionService {
    private tokenRefreshService: TokenRefreshService;

    constructor(private connectionRepository: IConnectionRepository) {
        this.tokenRefreshService = new TokenRefreshService(
            connectionRepository
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

    async forceTokenRefresh(userId: string, platform: Platform): Promise<string | null> {
        return this.tokenRefreshService.forceTokenRefresh(userId, platform);
    }

    async updateChatroomId(userId: string, provider: string, chatroomId: string): Promise<void> {
        return this.connectionRepository.updateChatroomId(userId, provider, chatroomId);
    }

    async getAccount(userId: string, provider: string): Promise<Connection | null> {
        return this.connectionRepository.findByUserAndProvider(userId, provider);
    }
}
