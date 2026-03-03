import { extractHeader, validateTimestamp, MAX_TIMESTAMP_AGE_MS } from '../utils';
import { Request } from 'express';
import { AppError } from '../../../utils/AppError';
import { logger } from '../../../utils/logger';

jest.mock('../../../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

describe('Webhook Utils', () => {
    describe('extractHeader', () => {
        it('debe extraer el primer header que coincida', () => {
            const mockReq = {
                header: jest.fn((name: string) => {
                    if (name === 'X-Test') return 'value';
                    return undefined;
                }),
            } as unknown as Request;

            expect(extractHeader(mockReq, ['X-Not-Found', 'X-Test'])).toBe('value');
        });

        it('debe retornar string vacío si no se encuentra ningún header', () => {
            const mockReq = {
                header: jest.fn().mockReturnValue(undefined),
            } as unknown as Request;

            expect(extractHeader(mockReq, ['X-Nope'])).toBe('');
        });
    });

    describe('validateTimestamp', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('debe aceptar un timestamp dentro del rango', () => {
            const validTimestamp = new Date('2024-01-01T11:58:00Z').toISOString();
            expect(() => validateTimestamp(validTimestamp)).not.toThrow();
        });

        it('debe lanzar error para formato de timestamp inválido', () => {
            expect(() => validateTimestamp('not-a-date')).toThrow(AppError);
        });

        it('debe lanzar error si el timestamp es demasiado antiguo', () => {
            const oldTimestamp = new Date(Date.now() - MAX_TIMESTAMP_AGE_MS - 1000).toISOString();
            expect(() => validateTimestamp(oldTimestamp)).toThrow('Webhook timestamp out of range');
            expect(logger.error).toHaveBeenCalled();
        });

        it('debe lanzar error si el timestamp es del futuro (fuera de tolerancia)', () => {
            const futureTimestamp = new Date(Date.now() + MAX_TIMESTAMP_AGE_MS + 1000).toISOString();
            expect(() => validateTimestamp(futureTimestamp)).toThrow('Webhook timestamp out of range');
        });

        it('debe registrar un aviso si hay un desfase menor pero notable', () => {
            const driftTimestamp = new Date(Date.now() - 61000).toISOString();
            validateTimestamp(driftTimestamp);
            expect(logger.warn).toHaveBeenCalled();
        });
    });
});
