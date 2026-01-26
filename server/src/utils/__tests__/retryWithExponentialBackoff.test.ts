/**
 * Tests para retryWithExponentialBackoff
 * Verifica el comportamiento del backoff exponencial
 */

import { retryWithExponentialBackoff, calculateBackoffDelay } from '../retryWithExponentialBackoff';

describe('retryWithExponentialBackoff', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('debe ejecutar la tarea inmediatamente', async () => {
        const task = jest.fn().mockResolvedValue(undefined);

        retryWithExponentialBackoff(task);

        await jest.runOnlyPendingTimersAsync();

        expect(task).toHaveBeenCalledTimes(1);
    });

    test('debe reintentar con backoff exponencial después de fallar', async () => {
        let attempts = 0;
        const task = jest.fn().mockImplementation(async () => {
            attempts++;
            if (attempts < 4) {
                throw new Error('Failed');
            }
        });

        retryWithExponentialBackoff(task, {
            initialIntervalMs: 1000,
            multiplier: 2,
            maxIntervalMs: 10000
        });

        // Intento 1: Falla inmediatamente
        await Promise.resolve();
        await Promise.resolve(); // Esperar a que se programe el siguiente timer
        expect(task).toHaveBeenCalledTimes(1);

        // Intento 2: Después de 1000ms (1s)
        jest.runAllTimers();
        await Promise.resolve();
        await Promise.resolve();
        expect(task).toHaveBeenCalledTimes(2);

        // Intento 3: Después de 2000ms (2s)
        jest.runAllTimers();
        await Promise.resolve();
        await Promise.resolve();
        expect(task).toHaveBeenCalledTimes(3);

        // Intento 4: Después de 4000ms (4s) - Éxito
        jest.runAllTimers();
        await Promise.resolve();
        await Promise.resolve();
        expect(task).toHaveBeenCalledTimes(4);
    });

    test('debe respetar el intervalo máximo', async () => {
        const task = jest.fn().mockRejectedValue(new Error('Failed'));
        const onError = jest.fn();

        retryWithExponentialBackoff(task, {
            initialIntervalMs: 1000,
            multiplier: 2,
            maxIntervalMs: 5000,
            onError
        });

        // Intento 1: Falla
        await jest.runOnlyPendingTimersAsync();
        expect(onError).toHaveBeenCalledWith(expect.any(Error), 1, 2000);

        // Intento 2: Espera 2000ms
        jest.advanceTimersByTime(2000);
        await jest.runOnlyPendingTimersAsync();
        expect(onError).toHaveBeenCalledWith(expect.any(Error), 2, 4000);

        // Intento 3: Espera 4000ms
        jest.advanceTimersByTime(4000);
        await jest.runOnlyPendingTimersAsync();
        expect(onError).toHaveBeenCalledWith(expect.any(Error), 3, 5000);

        // Intento 4: Espera 5000ms (máximo alcanzado)
        jest.advanceTimersByTime(5000);
        await jest.runOnlyPendingTimersAsync();
        expect(onError).toHaveBeenCalledWith(expect.any(Error), 4, 5000);

        // Intento 5: Sigue en 5000ms (no crece más)
        jest.advanceTimersByTime(5000);
        await jest.runOnlyPendingTimersAsync();
        expect(onError).toHaveBeenCalledWith(expect.any(Error), 5, 5000);
    });

    test('debe resetear el intervalo después de éxito', async () => {
        let attempts = 0;
        const task = jest.fn().mockImplementation(async () => {
            attempts++;
            if (attempts === 1) {
                throw new Error('Failed');
            }
            // Éxito en intento 2
        });

        const onError = jest.fn();

        retryWithExponentialBackoff(task, {
            initialIntervalMs: 1000,
            multiplier: 2,
            maxIntervalMs: 10000,
            onError
        });

        // Intento 1: Falla
        await Promise.resolve();
        await Promise.resolve();
        expect(task).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(expect.any(Error), 1, 2000);

        // Intento 2: Éxito después de 1000ms (resetea intervalo)
        jest.runAllTimers();
        await Promise.resolve();
        await Promise.resolve();
        expect(task).toHaveBeenCalledTimes(2);
    });

    test('debe llamar onRetry antes de cada reintento', async () => {
        const task = jest.fn().mockRejectedValue(new Error('Failed'));
        const onRetry = jest.fn();

        retryWithExponentialBackoff(task, {
            initialIntervalMs: 1000,
            multiplier: 2,
            maxIntervalMs: 10000,
            onRetry
        });

        // Intento 1: Falla
        await jest.runOnlyPendingTimersAsync();

        // Antes del intento 2
        jest.advanceTimersByTime(1000);
        expect(onRetry).toHaveBeenCalledWith(2, 2000);
        await jest.runOnlyPendingTimersAsync();

        // Antes del intento 3
        jest.advanceTimersByTime(2000);
        expect(onRetry).toHaveBeenCalledWith(3, 4000);
    });

    test('debe detener reintentos cuando se llama cleanup', async () => {
        const task = jest.fn().mockRejectedValue(new Error('Failed'));

        const cleanup = retryWithExponentialBackoff(task, {
            initialIntervalMs: 1000,
            multiplier: 2,
            maxIntervalMs: 10000
        });

        // Intento 1: Falla
        await Promise.resolve();
        expect(task).toHaveBeenCalledTimes(1);

        // Detener reintentos
        cleanup();

        // Avanzar tiempo - no debería reintentar
        jest.advanceTimersByTime(10000);
        await Promise.resolve();
        expect(task).toHaveBeenCalledTimes(1); // No aumentó
    });

    test('debe usar valores por defecto correctos', async () => {
        const task = jest.fn().mockRejectedValue(new Error('Failed'));
        const onError = jest.fn();

        retryWithExponentialBackoff(task, { onError });

        // Intento 1: Falla
        await jest.runOnlyPendingTimersAsync();

        // Verificar que usa 60000ms (1 minuto) por defecto
        expect(onError).toHaveBeenCalledWith(
            expect.any(Error),
            1,
            120000 // 60000 * 2
        );
    });

    test('debe manejar múltiples fallos consecutivos', async () => {
        const task = jest.fn().mockRejectedValue(new Error('Failed'));
        const onError = jest.fn();

        retryWithExponentialBackoff(task, {
            initialIntervalMs: 1000,
            multiplier: 2,
            maxIntervalMs: 16000,
            onError
        });

        const expectedDelays = [
            2000,   // 1000 * 2^1
            4000,   // 1000 * 2^2
            8000,   // 1000 * 2^3
            16000,  // 1000 * 2^4 (máximo)
            16000   // Se mantiene en el máximo
        ];

        for (let i = 0; i < expectedDelays.length; i++) {
            await jest.runOnlyPendingTimersAsync();
            expect(onError).toHaveBeenCalledWith(
                expect.any(Error),
                i + 1,
                expectedDelays[i]
            );
            jest.advanceTimersByTime(expectedDelays[i]);
        }
    });

    test('debe detener reintentos inmediatamente cuando se llama cleanup', async () => {
        const task = jest.fn().mockRejectedValue(new Error('Failed'));

        const cleanup = retryWithExponentialBackoff(task, {
            initialIntervalMs: 1000,
            multiplier: 2,
            maxIntervalMs: 10000
        });

        // Intento 1: Falla
        await Promise.resolve();
        expect(task).toHaveBeenCalledTimes(1);

        // Detener reintentos inmediatamente
        cleanup();

        // Avanzar tiempo - no debería reintentar
        jest.advanceTimersByTime(10000);
        await Promise.resolve();
        expect(task).toHaveBeenCalledTimes(1); // No aumentó
    });
});

describe('calculateBackoffDelay', () => {
    test('debe calcular delays correctamente', () => {
        const initialMs = 1000;
        const multiplier = 2;
        const maxMs = 10000;

        expect(calculateBackoffDelay(1, initialMs, multiplier, maxMs)).toBe(1000);
        expect(calculateBackoffDelay(2, initialMs, multiplier, maxMs)).toBe(2000);
        expect(calculateBackoffDelay(3, initialMs, multiplier, maxMs)).toBe(4000);
        expect(calculateBackoffDelay(4, initialMs, multiplier, maxMs)).toBe(8000);
        expect(calculateBackoffDelay(5, initialMs, multiplier, maxMs)).toBe(10000); // Máximo
        expect(calculateBackoffDelay(6, initialMs, multiplier, maxMs)).toBe(10000); // Se mantiene
    });

    test('debe manejar diferentes multiplicadores', () => {
        expect(calculateBackoffDelay(3, 1000, 3, 100000)).toBe(9000);  // 1000 * 3^2
        expect(calculateBackoffDelay(3, 1000, 1.5, 100000)).toBe(2250); // 1000 * 1.5^2
    });

    test('debe respetar el máximo', () => {
        expect(calculateBackoffDelay(10, 1000, 2, 5000)).toBe(5000);
        expect(calculateBackoffDelay(100, 1000, 2, 5000)).toBe(5000);
    });
});
