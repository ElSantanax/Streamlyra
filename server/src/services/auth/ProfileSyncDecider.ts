/** Decisor de sincronización de perfil basado en reglas de negocio del proveedor de identidad */

import { Platform } from '../../constants/platforms';
import { logger } from '../../utils/logger';

export interface ProfileSyncContext {
    isNewUser: boolean;
    isLinkingAccount: boolean;
    provider: Platform;
    userId: string;
}

export class ProfileSyncDecider {
    shouldSyncProfile(context: ProfileSyncContext): boolean {
        const { isNewUser, isLinkingAccount, provider, userId } = context;

        if (isNewUser) {
            logger.info(
                { userId, provider, reason: 'new_user' },
                'Profile sync: YES - New user registration'
            );
            return true;
        }

        const isLoginFlow = !isLinkingAccount;
        if (isLoginFlow && provider === 'twitch') {
            logger.info(
                { userId, provider, reason: 'twitch_login' },
                'Profile sync: YES - Twitch is identity provider'
            );
            return true;
        }

        logger.info(
            { userId, provider, reason: 'account_linking' },
            'Profile sync: NO - Account linking preserves current profile'
        );
        return false;
    }

    getSyncReason(context: ProfileSyncContext): string {
        if (context.isNewUser) return 'new_user_registration';
        if (!context.isLinkingAccount && context.provider === 'twitch') return 'twitch_identity_provider';
        return 'account_linking_no_sync';
    }
}
