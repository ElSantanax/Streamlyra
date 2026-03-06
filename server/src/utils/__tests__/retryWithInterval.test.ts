import { retryWithIntervalAndLimit } from '../retryWithInterval';

describe('retryWithIntervalAndLimit', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('debería ejecutar la función y detenerse en caso de éxito', async () => {
        const fn = jest.fn().mockResolvedValue(undefined);
        const onSuccess = jest.fn();

        const stop = retryWithIntervalAndLimit(fn, {
            intervalMs: 1000,
            onSuccess
        });

        jest.advanceTimersByTime(1000);

        await Promise.resolve();

        expect(fn).toHaveBeenCalledTimes(1);
        expect(onSuccess).toHaveBeenCalled();

        jest.advanceTimersByTime(2000);
        expect(fn).toHaveBeenCalledTimes(1);

        stop();
    });

    it('debería reintentar si la función falla', async () => {
        const fn = jest.fn()
            .mockRejectedValueOnce(new Error('fail1'))
            .mockResolvedValueOnce(undefined);

        const onRetry = jest.fn();
        const onError = jest.fn();
        const onSuccess = jest.fn();

        retryWithIntervalAndLimit(fn, {
            intervalMs: 1000,
            onRetry,
            onError,
            onSuccess
        });

        jest.advanceTimersByTime(1000);
        await Promise.resolve();
        await Promise.resolve();

        expect(onRetry).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(expect.any(Error));

        jest.advanceTimersByTime(1000);
        await Promise.resolve();
        await Promise.resolve();

        expect(onSuccess).toHaveBeenCalled();
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('debería detenerse tras alcanzar el límite de intentos', async () => {
        const fn = jest.fn().mockRejectedValue(new Error('fail'));
        const onMaxAttemptsReached = jest.fn();

        retryWithIntervalAndLimit(fn, {
            intervalMs: 1000,
            maxAttempts: 2,
            onMaxAttemptsReached
        });

        jest.advanceTimersByTime(1000);
        await Promise.resolve();
        await Promise.resolve();
        expect(fn).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(1000);
        await Promise.resolve();
        await Promise.resolve();

        expect(fn).toHaveBeenCalledTimes(2);
        expect(onMaxAttemptsReached).toHaveBeenCalled();

        jest.advanceTimersByTime(1000);
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('debería poder cancelarse externamente', async () => {
        const fn = jest.fn().mockResolvedValue(undefined);
        const stop = retryWithIntervalAndLimit(fn, { intervalMs: 1000 });

        stop();

        jest.advanceTimersByTime(1000);
        await Promise.resolve();

        expect(fn).not.toHaveBeenCalled();
    });

    it('no debería ejecutar callbacks si se cancela durante la ejecución (caso éxito)', async () => {
        let resolveFn: (value?: unknown) => void = () => { };
        const fn = jest.fn().mockImplementation(() => new Promise(resolve => {
            resolveFn = resolve;
        }));
        const onSuccess = jest.fn();

        const stop = retryWithIntervalAndLimit(fn, { intervalMs: 1000, onSuccess });

        jest.advanceTimersByTime(1000);

        stop();

        resolveFn();
        await Promise.resolve();

        expect(onSuccess).not.toHaveBeenCalled();
    });

    it('no debería ejecutar callbacks si se cancela durante la ejecución (caso error)', async () => {
        let rejectFn: (reason?: unknown) => void = () => { };
        const fn = jest.fn().mockImplementation(() => new Promise((_, reject) => {
            rejectFn = reject;
        }));
        const onRetry = jest.fn();

        const stop = retryWithIntervalAndLimit(fn, { intervalMs: 1000, onRetry });

        jest.advanceTimersByTime(1000);

        stop();

        rejectFn(new Error('late fail'));
        await Promise.resolve();
        await Promise.resolve();

        expect(onRetry).not.toHaveBeenCalled();
    });

    it('debería usar los valores por defecto si no se pasan opciones', async () => {
        const fn = jest.fn().mockResolvedValue(undefined);
        const stop = retryWithIntervalAndLimit(fn);

        jest.advanceTimersByTime(10000);
        await Promise.resolve();

        expect(fn).toHaveBeenCalledTimes(1);

        stop();
    });

    it('debería ignorar la ejecución si isActive es false al inicio del intento', async () => {
        const fn = jest.fn().mockResolvedValue(undefined);
        const onSuccess = jest.fn();

        const stop = retryWithIntervalAndLimit(fn, { intervalMs: 1000, onSuccess });

        stop();

        jest.advanceTimersByTime(1000);
        await Promise.resolve();

        expect(fn).not.toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();
    });
});