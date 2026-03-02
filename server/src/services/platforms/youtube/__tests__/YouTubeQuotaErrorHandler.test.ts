import axios, { AxiosError } from 'axios';
import { YouTubeQuotaErrorHandler } from '../YouTubeQuotaErrorHandler';
import { YouTubeQuotaManager } from '../../YouTubeQuotaManager';
import { AppError } from '../../../../utils/AppError';

jest.mock('../../YouTubeQuotaManager');

describe('YouTubeQuotaErrorHandler', () => {
    describe('isQuotaError', () => {
        it('debe retornar true cuando error es 403 con reason quotaExceeded', () => {
            const error: Partial<AxiosError> = {
                isAxiosError: true,
                response: {
                    status: 403,
                    data: {
                        error: {
                            errors: [{ reason: 'quotaExceeded' }]
                        }
                    }
                } as AxiosError['response']
            };

            jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

            const result = YouTubeQuotaErrorHandler.isQuotaError(error);

            expect(result).toBe(true);
        });

        it('debe retornar false cuando error no es 403', () => {
            const error: Partial<AxiosError> = {
                isAxiosError: true,
                response: {
                    status: 500,
                    data: {}
                } as AxiosError['response']
            };

            jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

            const result = YouTubeQuotaErrorHandler.isQuotaError(error);

            expect(result).toBe(false);
        });

        it('debe retornar false cuando error no tiene reason quotaExceeded', () => {
            const error: Partial<AxiosError> = {
                isAxiosError: true,
                response: {
                    status: 403,
                    data: {
                        error: {
                            errors: [{ reason: 'forbidden' }]
                        }
                    }
                } as AxiosError['response']
            };

            jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

            const result = YouTubeQuotaErrorHandler.isQuotaError(error);

            expect(result).toBe(false);
        });

        it('debe retornar false cuando error no es AxiosError', () => {
            const error = new Error('Generic error');

            jest.spyOn(axios, 'isAxiosError').mockReturnValue(false);

            const result = YouTubeQuotaErrorHandler.isQuotaError(error);

            expect(result).toBe(false);
        });
    });

    describe('handleQuotaError', () => {
        let mockQuotaManager: jest.Mocked<YouTubeQuotaManager>;

        beforeEach(() => {
            mockQuotaManager = {
                markAsExhausted: jest.fn().mockResolvedValue(undefined)
            } as unknown as jest.Mocked<YouTubeQuotaManager>;

            (YouTubeQuotaManager.getInstance as jest.Mock).mockReturnValue(mockQuotaManager);
        });

        it('debe marcar cuota como agotada y lanzar AppError cuando es error de cuota', async () => {
            const error: Partial<AxiosError> = {
                isAxiosError: true,
                response: {
                    status: 403,
                    data: {
                        error: {
                            errors: [{ reason: 'quotaExceeded' }]
                        }
                    }
                } as AxiosError['response']
            };

            jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

            await expect(YouTubeQuotaErrorHandler.handleQuotaError(error))
                .rejects
                .toThrow(AppError);

            expect(mockQuotaManager.markAsExhausted).toHaveBeenCalled();
        });

        it('no debe hacer nada cuando error no es de cuota', async () => {
            const error = new Error('Generic error');

            jest.spyOn(axios, 'isAxiosError').mockReturnValue(false);

            await expect(YouTubeQuotaErrorHandler.handleQuotaError(error))
                .resolves
                .toBeUndefined();

            expect(mockQuotaManager.markAsExhausted).not.toHaveBeenCalled();
        });
    });
});
