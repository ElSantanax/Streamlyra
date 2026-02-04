import { AuthFlowProcessor } from './AuthFlowProcessor';
import { UserProfileService } from './core/UserProfileService';
import { Platform } from '../../constants/platforms';
import { AuthResponse } from './AuthDTOBuilder';

export class AuthService {
    constructor(
        private flowProcessor: AuthFlowProcessor,
        private userProfileService: UserProfileService
    ) { }

    async handleOAuthAuth(
        platform: Platform,
        code: string,
        codeVerifier?: string,
        currentUserId?: string
    ): Promise<AuthResponse> {
        return this.flowProcessor.handleOAuthFlow(platform, code, codeVerifier, currentUserId);
    }

    async handleTikTokAuth(username: string, currentUserId?: string): Promise<AuthResponse> {
        return this.flowProcessor.handleTikTokFlow(username, currentUserId);
    }

    async getUserProfile(userId: string) {
        return this.userProfileService.getUserProfile(userId);
    }

    async disconnectPlatform(userId: string, provider: Platform) {
        return this.flowProcessor.handleDisconnection(userId, provider);
    }

    async logout(userId: string | undefined): Promise<void> {
        return this.flowProcessor.handleLogout(userId);
    }
}