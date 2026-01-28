/**
 * Decisor de Sincronización de Perfil
 * Responsabilidad: Decidir si se debe sincronizar el perfil del usuario (Capa de Lógica de Negocio)
 * 
 * Reglas de negocio:
 * 1. Nuevo usuario → Siempre sincronizar (primera vez en el sistema)
 * 2. Login con Twitch → Sincronizar (Twitch es el Identity Provider)
 * 3. Vinculación de cuenta → NO sincronizar (mantener perfil actual)
 */

import { Platform } from '../../constants/platforms';
import { logger } from '../../utils/logger';

export interface ProfileSyncContext {
    isNewUser: boolean;
    isLinkingAccount: boolean;
    provider: Platform;
    userId: string;
}

export class ProfileSyncDecider {
    /**
     * Decide si se debe sincronizar el perfil del usuario
     * @param context - Contexto de sincronización
     * @returns true si se debe sincronizar
     */
    shouldSyncProfile(context: ProfileSyncContext): boolean {
        const { isNewUser, isLinkingAccount, provider, userId } = context;

        // Caso 1: Nuevo usuario → Siempre sincronizar
        if (isNewUser) {
            logger.info(
                { userId, provider, reason: 'new_user' },
                'Profile sync: YES - New user registration'
            );
            return true;
        }

        // Caso 2: Login con Twitch (Identity Provider) → Sincronizar
        const isLoginFlow = !isLinkingAccount;
        if (isLoginFlow && provider === 'twitch') {
            logger.info(
                { userId, provider, reason: 'twitch_login' },
                'Profile sync: YES - Twitch is identity provider'
            );
            return true;
        }

        // Caso 3: Vinculación de cuenta → NO sincronizar
        logger.info(
            { userId, provider, reason: 'account_linking' },
            'Profile sync: NO - Account linking preserves current profile'
        );
        return false;
    }

    /**
     * Explica por qué se tomó la decisión (útil para debugging)
     * @param context - Contexto de sincronización
     * @returns Razón de la decisión
     */
    getSyncReason(context: ProfileSyncContext): string {
        if (context.isNewUser) return 'new_user_registration';
        if (!context.isLinkingAccount && context.provider === 'twitch') return 'twitch_identity_provider';
        return 'account_linking_no_sync';
    }
}
