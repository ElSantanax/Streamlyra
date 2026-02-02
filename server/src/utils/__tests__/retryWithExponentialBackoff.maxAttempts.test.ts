/**
 * Tests para verificar que maxAttempts funciona correctamente en retryWithExponentialBackoff
 */

import { retryWithExponentialBackoff } from '../retryWithExponentialBackoff';

describe('retryWithExponentialBackoff - maxAttempts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it('should stop retrying after maxAttempts is reached', async () => {
        const mockTask = jest.fn().mockRejectedValue(new Error('Connection failed'));
        const onMaxAttemptsReached = jest.fn();

        retryWithExponentialBackoff(mockTask, {
            initialIntervalMs: 1000,
            multiplier: 1,
            maxIntervalMs: 1000,
            maxAttempts: 3,
            onMaxAttemptsReached
        });

        // Intento 1 (inmediato)
        await jest.runAllTimersAsync();
        expect(mockTask).toHaveBeenCalledTimes(1);

        // Intento 2 (después de 1s)
        jest.advanceTimersByTime(1000);
        await jest.runAllTimersAsync();
        expect(mockTask).toHaveBeenCalledTimes(2);

        // Intento 3 (después de 1s)
        jest.advanceTimersByTime(1000);
        await jest.runAllTimersAsync();
        expect(mockTask).toHaveBeenCalledTimes(3);

        // Intento 4 debería ser bloqueado por maxAttempts
        jest.advanceTimersByTime(1000);
        await jest.runAllTimersAsync();
        expect(mockTask).toHaveBeenCalledTimes(3); // No más intentos

        // Verificar que se llamó el callback
        expect(onMaxAttemptsReached).toHaveBeenCalledTimes(1);
    });

    it('should work with TikTok configuration (12 attempts, 10s interval)', async () => {
        const mockTask = jest.fn().mockRejectedValue(new Error('TikTok connection failed'));
        const onMaxAttemptsReached = jest.fn();
        const onError = jest.fn();

        retryWithExponentialBackoff(mockTask, {
            initialIntervalMs: 10000,  // 10 segundos
            multiplier: 1,              // Sin incremento
            maxIntervalMs: 10000,       // Siempre 10s
            maxAttempts: 12,            // 12 intentos
            onMaxAttemptsReached,
            onError
        });

        // Simular los 12 intentos
        for (let i = 1; i <= 12; i++) {
            await jest.runAllTimersAsync();
            expect(mockTask).toHaveBeenCalledTimes(i);
            
            if (i < 12) {
                jest.advanceTimersByTime(10000); // Avanzar 10 segundos
            }
        }

        // Verificar que se hicieron exactamente 12 intentos
        expect(mockTask).toHaveBeenCalledTimes(12);

        // Verificar que onError se llamó 12 veces
        expect(onError).toHaveBeenCalledTimes(12);

        // Intento 13 no debería ocurrir
        jest.advanceTimersByTime(10000);
        await jest.runAllTimersAsync();
        expect(mockTask).toHaveBeenCalledTimes(12); // Sigue siendo 12

        // Verificar que se llamó el callback de max attempts
        expect(onMaxAttemptsReached).toHaveBeenCalledTimes(1);
    });

    it('should calculate total duration correctly (12 attempts * 10s = 120s)', async () => {
        const mockTask = jest.fn().mockRejectedValue(new Error('Failed'));
        const onMaxAttemptsReached = jest.fn();
        
        const startTime = Date.now();

        retryWithExponentialBackoff(mockTask, {
            initialIntervalMs: 10000,
            multiplier: 1,
            maxIntervalMs: 10000,
            maxAttempts: 12,
            onMaxAttemptsReached
        });

        // Simular todos los intentos
        for (let i = 0; i < 12; i++) {
            await jest.runAllTimersAsync();
            if (i < 11) {
                jest.advanceTimersByTime(10000);
            }
        }

        const endTime = Date.now();
        const totalDuration = endTime - startTime;

        // Duración total debería ser aproximadamente 110 segundos
        // (11 intervalos de 10s entre 12 intentos)
        expect(totalDuration).toBeGreaterThanOrEqual(110000);
        expect(totalDuration).toBeLessThan(120000);

        expect(onMaxAttemptsReached).toHaveBeenCalled();
    });

    it('should reset attempts counter on successful connection', async () => {
        let attemptCount = 0;
        const mockTask = jest.fn().mockImplementation(async () => {
            attemptCount++;
            if (attemptCount < 3) {
                throw new Error('Failed');
            }
            // Éxito en el tercer intento
        });

        const onMaxAttemptsReached = jest.fn();

        retryWithExponentialBackoff(mockTask, {
            initialIntervalMs: 1000,
            multiplier: 1,
            maxIntervalMs: 1000,
            maxAttempts: 5,
            onMaxAttemptsReached
        });

        // Intento 1 (falla)
        await jest.runAllTimersAsync();
        expect(mockTask).toHaveBeenCalledTimes(1);

        // Intento 2 (falla)
        jest.advanceTimersByTime(1000);
        await jest.runAllTimersAsync();
        expect(mockTask).toHaveBeenCalledTimes(2);

        // Intento 3 (éxito)
        jest.advanceTimersByTime(1000);
        await jest.runAllTimersAsync();
        expect(mockTask).toHaveBeenCalledTimes(3);

        // No debería llamar onMaxAttemptsReached porque tuvo éxito
        expect(onMaxAttemptsReached).not.toHaveBeenCalled();
    });

    it('should not retry if maxAttempts is 1', async () => {
        const mockTask = jest.fn().mockRejectedValue(new Error('Failed'));
        const onMaxAttemptsReached = jest.fn();

        retryWithExponentialBackoff(mockTask, {
            initialIntervalMs: 1000,
            maxAttempts: 1,
            onMaxAttemptsReached
        });

        // Solo el intento inicial
        await jest.runAllTimersAsync();
        expect(mockTask).toHaveBeenCalledTimes(1);

        // No debería haber más intentos
        jest.advanceTimersByTime(5000);
        await jest.runAllTimersAsync();
        expect(mockTask).toHaveBeenCalledTimes(1);

        expect(onMaxAttemptsReached).toHaveBeenCalledTimes(1);
    });

    it('should work without maxAttempts (infinite retries)', async () => {
        const mockTask = jest.fn().mockRejectedValue(new Error('Failed'));

        retryWithExponentialBackoff(mockTask, {
            initialIntervalMs: 1000,
            multiplier: 1,
            maxIntervalMs: 1000
            // Sin maxAttempts
        });

        // Simular muchos intentos
        for (let i = 0; i < 50; i++) {
            await jest.runAllTimersAsync();
            jest.advanceTimersByTime(1000);
        }

        // Debería haber hecho 50 intentos sin detenerse
        expect(mockTask).toHaveBeenCalledTimes(50);
    });

    it('should call cleanup function to stop retries', async () => {
        const mockTask = jest.fn().mockRejectedValue(new Error('Failed'));
        const onMaxAttemptsReached = jest.fn();

        const cleanup = retryWithExponentialBackoff(mockTask, {
            initialIntervalMs: 1000,
            multiplier: 1,
            maxIntervalMs: 1000,
            maxAttempts: 10,
            onMaxAttemptsReached
        });

        // Hacer algunos intentos
        await jest.runAllTimersAsync();
        expect(mockTask).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(1000);
        await jest.runAllTimersAsync();
        expect(mockTask).toHaveBeenCalledTimes(2);

        // Llamar cleanup para detener
        cleanup();

        // No debería haber más intentos
        jest.advanceTimersByTime(10000);
        await jest.runAllTimersAsync();
        expect(mockTask).toHaveBeenCalledTimes(2);

        // onMaxAttemptsReached no debería llamarse porque se detuvo manualmente
        expect(onMaxAttemptsReached).not.toHaveBeenCalled();
    });
});
