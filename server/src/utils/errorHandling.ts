/** Utilidades para manejo de errores con logging automático */

import { logger } from './logger';

export interface ErrorContext {
    userId?: string;
    platform?: string;
    action?: string;
    [key: string]: unknown;
}

export async function withErrorHandling<T>(
    fn: () => Promise<T>,
    context: ErrorContext & { action: string },
    options: { rethrow?: boolean } = { rethrow: true }
): Promise<T | undefined> {
    const { action, ...logContext } = context;

    try {
        logger.debug(logContext, `${action} started`);
        const result = await fn();
        logger.debug(logContext, `${action} completed`);
        return result;
    } catch (error) {
        logger.error({ err: error, ...logContext }, `Error in ${action}`);

        if (options.rethrow) {
            throw error;
        }

        return undefined;
    }
}

