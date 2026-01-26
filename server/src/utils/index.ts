/**
 * Exports centralizados de todas las utilidades
 * 
 * Responsabilidad: Funciones helper generales
 */

export { AppError } from './AppError';
export { logger } from './logger';
export { MessageDeduplicator } from './messageDeduplicate';
export { retryWithInterval } from './retryWithInterval';
export * from './oauth.utils';
export { calculateTokenExpiry } from './tokenUtils';
export { SocketEventEmitter } from './SocketEventEmitter';
export {
    withErrorHandling,
    withErrorHandlingSync,
    toAppError,
    getErrorMessage,
    validateRequired,
    validateNotEmpty,
    executeWithErrorCollection,
    retryWithBackoff
} from './errorHandling';
export type { ErrorContext } from './errorHandling';
