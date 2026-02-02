/** Orquestador del flujo completo de autenticación OAuth */

import { PlatformServiceFactory } from '../../platforms/PlatformServiceFactory';
import { AuthInputValidator } from '../AuthInputValidator';
import { AuthChatOrchestrator } from '../AuthChatOrchestrator';
import { PlatformAuthHandler } from '../core/PlatformAuthHandler';
import { AuthResponse } from '../AuthResponseBuilder';
import { Platform } from '../../../constants/platforms';
import { AppError } from '../../../utils/AppError';
import { withErrorHandling } from '../../../utils/errorHandling';

export class OAuthFlowOrchestrator {
    constructor(
        private inputValidator: AuthInputValidator,
        private platformAuthHandler: PlatformAuthHandler,
        private chatOrchestrator: AuthChatOrchestrator
    ) {}

    async handleOAuthAuth(
        platform: Platform,
        code: string,
        codeVerifier?: string,
        currentUserId?: string
    ): Promise<AuthResponse> {
        const result = await withErrorHandling(
            async () => {
                this.inputValidator.validateAuthorizationCode(code, platform);

                const oauthService = PlatformServiceFactory.getService(platform);
                const { profile, tokens } = await oauthService.getProfileAndTokens(code, codeVerifier);

                this.inputValidator.validateOAuthTokens(tokens, platform);

                const authResult = await this.platformAuthHandler.handlePlatformAuth(
                    profile,
                    tokens,
                    currentUserId
                );

                await this.chatOrchestrator.connectIfNeeded({
                    userId: authResult.user.id,
                    platform,
                    shouldConnect: authResult.connectionActive,
                    reason: authResult.activationReason
                });

                return authResult;
            },
            { platform, action: 'handleOAuthAuth' },
            { rethrow: true }
        );

        if (!result) {
            throw new AppError('OAuth authentication failed', 500);
        }

        return result;
    }
}
