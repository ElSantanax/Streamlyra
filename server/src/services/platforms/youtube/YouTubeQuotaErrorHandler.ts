import axios from 'axios';
import { AppError } from '../../../utils/AppError';
import { YouTubeQuotaManager } from '../YouTubeQuotaManager';

export class YouTubeQuotaErrorHandler {
    static isQuotaError(error: unknown): boolean {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            const errorData = error.response.data as { error?: { errors?: Array<{ reason?: string }> } };
            return errorData?.error?.errors?.some(e => e.reason === 'quotaExceeded') || false;
        }
        return false;
    }

    static async handleQuotaError(error: unknown): Promise<void> {
        if (this.isQuotaError(error)) {
            await YouTubeQuotaManager.getInstance().markAsExhausted();
            throw new AppError(
                'Cuota de YouTube agotada. Intenta mañana.',
                403
            );
        }
    }
}