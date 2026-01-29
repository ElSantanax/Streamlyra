/** Decisor de activación de conexión basado en reglas de negocio del contexto de autenticación */

import { logger } from '../../utils/logger';

export interface ConnectionActivationContext {
    isNewUser: boolean;
    isLinkingAccount: boolean;
    hasExistingConnection: boolean;
    userId: string;
    platform: string;
}

export class ConnectionActivationDecider {
    shouldActivateConnection(context: ConnectionActivationContext): boolean {
        const { isNewUser, isLinkingAccount, hasExistingConnection, userId, platform } = context;

        if (isNewUser) {
            logger.info(
                { userId, platform, reason: 'new_user' },
                'Connection activation: YES - New user registration'
            );
            return true;
        }

        if (isLinkingAccount) {
            logger.info(
                { userId, platform, reason: 'explicit_link' },
                'Connection activation: YES - User explicitly linking account'
            );
            return true;
        }

        if (hasExistingConnection) {
            logger.info(
                { userId, platform, reason: 'existing_connection' },
                'Connection activation: YES - Refreshing existing connection'
            );
            return true;
        }

        logger.info(
            { userId, platform, reason: 'normal_login' },
            'Connection activation: NO - Normal login without prior connection'
        );
        return false;
    }

    getActivationReason(context: ConnectionActivationContext): string {
        if (context.isNewUser) return 'new_user_registration';
        if (context.isLinkingAccount) return 'explicit_account_linking';
        if (context.hasExistingConnection) return 'existing_connection_refresh';
        return 'normal_login_no_activation';
    }
}
