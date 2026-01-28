/**
 * Manejador de Errores de TikTok
 * Responsabilidad: Categorizar y proporcionar información sobre errores de conexión
 */

export interface TikTokErrorInfo {
    type: string;
    isPermanent: boolean;
    userMessage: string;
    logMessage: string;
}

interface ErrorWithAggregates {
    aggregateErrors?: Array<{ message?: string }>;
}

export class TikTokErrorHandler {
    categorizeError(error: unknown, username: string): TikTokErrorInfo {
        const errorStr = String(error);
        const errorObj = error as ErrorWithAggregates;

        // Error de usuario no encontrado (permanente)
        if (this.isUserNotFoundError(errorStr, errorObj)) {
            return {
                type: 'user_not_found',
                isPermanent: true,
                userMessage: `Usuario @${username} no encontrado. Verifica el nombre de usuario.`,
                logMessage: 'TikTok user not found'
            };
        }

        // Error de cuenta privada/oculta (permanente)
        if (this.isPrivateAccountError(errorStr)) {
            return {
                type: 'private_account',
                isPermanent: true,
                userMessage: 'Cuenta privada u oculta. No se puede acceder.',
                logMessage: 'TikTok account is private or hidden'
            };
        }

        // Error de bloqueo por TikTok (temporal pero requiere atención)
        if (this.isBlockedError(errorStr)) {
            return {
                type: 'blocked',
                isPermanent: false,
                userMessage: 'Bloqueado temporalmente por TikTok. Reintentando...',
                logMessage: 'Temporarily blocked by TikTok'
            };
        }

        // Usuario no está en vivo (temporal - recuperable)
        if (this.isNotLiveError(errorStr)) {
            return {
                type: 'not_live',
                isPermanent: false,
                userMessage: 'Usuario no está en vivo. Esperando...',
                logMessage: 'TikTok user is not live'
            };
        }

        // Timeout de conexión (temporal - recuperable)
        if (this.isTimeoutError(errorStr)) {
            return {
                type: 'timeout',
                isPermanent: false,
                userMessage: 'Tiempo de espera agotado. Reintentando...',
                logMessage: 'Connection timeout'
            };
        }

        // Error genérico (temporal - recuperable)
        return {
            type: 'unknown',
            isPermanent: false,
            userMessage: 'Error al conectar. Reintentando...',
            logMessage: 'Unknown TikTok connection error'
        };
    }

    private isUserNotFoundError(errorStr: string, errorObj: ErrorWithAggregates): boolean {
        return errorStr.includes('user_not_found') ||
            errorStr.includes('User not found') ||
            (errorObj?.aggregateErrors?.some((e) => e?.message?.includes('user_not_found')) ?? false);
    }

    private isPrivateAccountError(errorStr: string): boolean {
        return errorStr.includes('private') || errorStr.includes('hidden');
    }

    private isBlockedError(errorStr: string): boolean {
        return errorStr.includes('SIGI_STATE') || errorStr.includes('blocked by TikTok');
    }

    private isNotLiveError(errorStr: string): boolean {
        return errorStr.includes('not_live') || errorStr.includes('LIVE_ACCESS_ROOM_ERROR');
    }

    private isTimeoutError(errorStr: string): boolean {
        return errorStr.includes('timeout') || errorStr.includes('Connection timeout');
    }
}
