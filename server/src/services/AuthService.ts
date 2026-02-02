import { OAuthFlowOrchestrator } from './auth/orchestrators/OAuthFlowOrchestrator';
import { TikTokFlowOrchestrator } from './auth/orchestrators/TikTokFlowOrchestrator';
import { DisconnectionOrchestrator } from './auth/orchestrators/DisconnectionOrchestrator';
import { UserProfileService } from './auth/core/UserProfileService';
import { PlatformAuthHandler } from './auth/core/PlatformAuthHandler';
import { ProfileSyncService } from './auth/ProfileSyncService';
import { ConnectionCreationService } from './auth/ConnectionCreationService';
import { AuthInputValidator } from './auth/AuthInputValidator';
import { ConnectionActivationDecider } from './auth/ConnectionActivationDecider';
import { AuthChatOrchestrator } from './auth/AuthChatOrchestrator';
import { AuthResponseBuilder } from './auth/AuthResponseBuilder';
import { TikTokProfileFactory } from './auth/TikTokProfileFactory';
import { TikTokTokenGenerator } from './auth/TikTokTokenGenerator';
import { UserProfileBuilder } from './auth/UserProfileBuilder';
import { ProfileSyncDecider } from './auth/ProfileSyncDecider';
import { UserService } from './user/UserService';
import { ConnectionService } from './connection/ConnectionService';
import { ChatManager } from './ChatManager';
import { IUserRepository } from '../repositories/interfaces/IUserRepository';
import { IConnectionRepository } from '../repositories/interfaces/IConnectionRepository';
import { Platform } from '../constants/platforms';

export class AuthService {
    private oauthFlowOrchestrator: OAuthFlowOrchestrator;
    private tiktokFlowOrchestrator: TikTokFlowOrchestrator;
    private disconnectionOrchestrator: DisconnectionOrchestrator;
    private userProfileService: UserProfileService;

    constructor(
        userRepository: IUserRepository,
        connectionRepository: IConnectionRepository,
        chatManager: ChatManager
    ) {
        // Servicios base
        const userService = new UserService(userRepository, connectionRepository);
        const connectionService = new ConnectionService(connectionRepository);
        
        // Componentes de autenticación
        const profileSyncService = new ProfileSyncService();
        const connectionCreationService = new ConnectionCreationService(connectionRepository);
        const inputValidator = new AuthInputValidator();
        const activationDecider = new ConnectionActivationDecider();
        const chatOrchestrator = new AuthChatOrchestrator(chatManager);
        const responseBuilder = new AuthResponseBuilder();
        const profileSyncDecider = new ProfileSyncDecider();
        const userProfileBuilder = new UserProfileBuilder();
        
        // Componentes TikTok
        const tiktokProfileFactory = new TikTokProfileFactory();
        const tiktokTokenGenerator = new TikTokTokenGenerator();

        // Handler central de autenticación de plataforma
        const platformAuthHandler = new PlatformAuthHandler(
            userService,
            connectionService,
            profileSyncService,
            connectionCreationService,
            activationDecider,
            profileSyncDecider,
            responseBuilder
        );

        // Orquestadores
        this.oauthFlowOrchestrator = new OAuthFlowOrchestrator(
            inputValidator,
            platformAuthHandler,
            chatOrchestrator
        );

        this.tiktokFlowOrchestrator = new TikTokFlowOrchestrator(
            inputValidator,
            tiktokProfileFactory,
            tiktokTokenGenerator,
            platformAuthHandler,
            chatOrchestrator
        );

        this.disconnectionOrchestrator = new DisconnectionOrchestrator(
            connectionService,
            chatOrchestrator
        );

        this.userProfileService = new UserProfileService(
            userService,
            userProfileBuilder
        );
    }

    async handleOAuthAuth(
        platform: Platform,
        code: string,
        codeVerifier?: string,
        currentUserId?: string
    ) {
        return this.oauthFlowOrchestrator.handleOAuthAuth(platform, code, codeVerifier, currentUserId);
    }

    async handleTikTokAuth(username: string, currentUserId?: string) {
        return this.tiktokFlowOrchestrator.handleTikTokAuth(username, currentUserId);
    }

    async getUserProfile(userId: string) {
        return this.userProfileService.getUserProfile(userId);
    }

    async disconnectPlatform(userId: string, provider: Platform) {
        return this.disconnectionOrchestrator.disconnectPlatform(userId, provider);
    }

    async logout(userId: string | undefined): Promise<void> {
        return this.disconnectionOrchestrator.logout(userId);
    }
}