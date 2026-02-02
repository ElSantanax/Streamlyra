/** Orquestador del flujo completo de autenticación TikTok */

import { AuthInputValidator } from '../AuthInputValidator';
import { TikTokProfileFactory } from '../TikTokProfileFactory';
import { TikTokTokenGenerator } from '../TikTokTokenGenerator';
import { AuthChatOrchestrator } from '../AuthChatOrchestrator';
import { PlatformAuthHandler } from '../core/PlatformAuthHandler';
import { AuthResponse } from '../AuthResponseBuilder';
import { AppError } from '../../../utils/AppError';

export class TikTokFlowOrchestrator {
    constructor(
        private inputValidator: AuthInputValidator,
        private tiktokProfileFactory: TikTokProfileFactory,
        private tiktokTokenGenerator: TikTokTokenGenerator,
        private platformAuthHandler: PlatformAuthHandler,
        private chatOrchestrator: AuthChatOrchestrator
    ) {}

    async handleTikTokAuth(username: string, currentUserId?: string): Promise<AuthResponse> {
        if (!currentUserId) {
            throw new AppError('TikTok authentication requires an authenticated user', 401);
        }

        const cleanUsername = this.inputValidator.validateTikTokUsername(username);
        const profile = this.tiktokProfileFactory.createProfile(cleanUsername);
        const tokens = this.tiktokTokenGenerator.generatePlaceholderTokens(cleanUsername);

        const result = await this.platformAuthHandler.handlePlatformAuth(profile, tokens, currentUserId);

        await this.chatOrchestrator.connectIfNeeded({
            userId: result.user.id,
            platform: 'tiktok',
            shouldConnect: result.connectionActive,
            reason: result.activationReason
        });

        return result;
    }
}
