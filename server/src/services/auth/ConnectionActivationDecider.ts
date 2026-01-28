/**
 * Decisor de Activación de Conexión
 * Responsabilidad: Decidir si se debe activar una conexión de streaming
 * 
 * Reglas de negocio:
 * 1. Nuevo usuario → Auto-activar (conveniencia)
 * 2. Usuario vinculando cuenta → Activar (acción explícita)
 * 3. Conexión existente → Activar (actualizar tokens)
 * 4. Login normal sin conexión previa → NO activar (evitar activación no deseada)
 */

import { logger } from '../../utils/logger';

export interface ConnectionActivationContext {
    isNewUser: boolean;
    isLinkingAccount: boolean;
    hasExistingConnection: boolean;
    userId: string;
    platform: string;
}

export class ConnectionActivationDecider {
    /**
     * Decide si se debe activar una conexión de streaming
     * @param context - Contexto de la autenticación
     * @returns true si se debe activar la conexión, false en caso contrario
     */
    shouldActivateConnection(context: ConnectionActivationContext): boolean {
        const { isNewUser, isLinkingAccount, hasExistingConnection, userId, platform } = context;

        // Caso 1: Nuevo usuario → Auto-activar para mejor experiencia inicial
        if (isNewUser) {
            logger.info(
                { userId, platform, reason: 'new_user' },
                'Connection activation: YES - New user registration'
            );
            return true;
        }

        // Caso 2: Usuario vinculando cuenta desde dashboard → Activar (acción explícita)
        if (isLinkingAccount) {
            logger.info(
                { userId, platform, reason: 'explicit_link' },
                'Connection activation: YES - User explicitly linking account'
            );
            return true;
        }

        // Caso 3: Conexión ya existe → Activar para actualizar tokens
        if (hasExistingConnection) {
            logger.info(
                { userId, platform, reason: 'existing_connection' },
                'Connection activation: YES - Refreshing existing connection'
            );
            return true;
        }

        // Caso 4: Login normal sin conexión previa → NO activar
        // Evita activar streaming automáticamente cuando el usuario solo quiere hacer login
        logger.info(
            { userId, platform, reason: 'normal_login' },
            'Connection activation: NO - Normal login without prior connection'
        );
        return false;
    }

    /**
     * Explica por qué se tomó la decisión (útil para debugging y logs)
     * @param context - Contexto de la autenticación
     * @returns Razón de la decisión
     */
    getActivationReason(context: ConnectionActivationContext): string {
        if (context.isNewUser) return 'new_user_registration';
        if (context.isLinkingAccount) return 'explicit_account_linking';
        if (context.hasExistingConnection) return 'existing_connection_refresh';
        return 'normal_login_no_activation';
    }
}
