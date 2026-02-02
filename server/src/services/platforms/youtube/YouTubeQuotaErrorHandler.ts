/** Manejador de errores de cuota de YouTube */

import axios from 'axios';
import { AppError } from '../../../utils/AppError';
import { YouTubeQuotaManager } from '../YouTubeQuotaManager';

export class YouTubeQuotaErrorHandler {
    /**
     * Verifica si un error es de cuota agotada
     */
    static isQuotaError(error: unknown): boolean {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            const errorData = error.response.data as { error?: { errors?: Array<{ reason?: string }> } };
            return errorData?.error?.errors?.some(e => e.reason === 'quotaExceeded') || false;
        }
        return false;
    }

    /**
     * Maneja errores de cuota agotada
     * Marca la cuota como agotada y lanza un AppError
     */
    static handleQuotaError(error: unknown): void {
        if (this.isQuotaError(error)) {
            YouTubeQuotaManager.getInstance().markAsExhausted();
            throw new AppError(
                'Cuota de YouTube agotada. Intenta mañana.',
                403
            );
        }
    }
}
