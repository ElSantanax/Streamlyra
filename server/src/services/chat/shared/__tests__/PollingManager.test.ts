import { PollingManager } from '../PollingManager';
import { logger } from '../../../../utils/logger';

jest.mock('../../../../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        info: jest.fn(),
        debug: jest.fn()
    }
}));

describe('PollingManager', () => {
    let pollingManager: PollingManager;

    beforeEach(() => {
        pollingManager = new PollingManager();
        jest.useFakeTimers();
        jest.clearAllMocks();
    });

    afterEach(() => {
        pollingManager.stopAll();
        jest.useRealTimers();
    });

    describe('start', () => {
        it('debería ejecutar la tarea inmediatamente', async () => {
            const task = jest.fn().mockResolvedValue(undefined);
            pollingManager.start('test-id', task, 1000);
            await Promise.resolve();

            expect(task).toHaveBeenCalledTimes(1);
            expect(pollingManager.isRunning('test-id')).toBe(true);
        });

        it('debería programar la siguiente ejecución después de completar la tarea', async () => {
            const task = jest.fn().mockResolvedValue(undefined);
            pollingManager.start('test-id', task, 1000);

            // Primera ejecución (inmediata)
            await Promise.resolve();
            await Promise.resolve();

            // Adelantar el tiempo
            jest.advanceTimersByTime(1000);

            // Segunda ejecución programada
            await Promise.resolve();
            await Promise.resolve();

            expect(task).toHaveBeenCalledTimes(2);
        });

        it('no debería permitir múltiples ejecuciones para el mismo ID', async () => {
            const task = jest.fn().mockResolvedValue(undefined);
            pollingManager.start('test-id', task, 1000);
            pollingManager.start('test-id', task, 1000);
            await Promise.resolve();

            expect(task).toHaveBeenCalledTimes(1);
        });

        it('debería registrar un error si la tarea falla', async () => {
            const error = new Error('Task failed');
            const task = jest.fn().mockRejectedValue(error);

            pollingManager.start('test-id', task, 1000);

            // Esperar a que la tarea asíncrona falle
            await Promise.resolve();
            await Promise.resolve();

            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({ err: error, pollingId: 'test-id' }),
                'Error in polling task'
            );
        });
    });

    describe('stop', () => {
        it('debería detener las ejecuciones futuras', async () => {
            const task = jest.fn().mockResolvedValue(undefined);
            pollingManager.start('test-id', task, 1000);

            await Promise.resolve();
            pollingManager.stop('test-id');

            jest.advanceTimersByTime(1000);
            await Promise.resolve();

            expect(task).toHaveBeenCalledTimes(1);
            expect(pollingManager.isRunning('test-id')).toBe(false);
        });

        it('no debería reprogramar la tarea si se detiene durante la ejecución', async () => {
            let resolveTask: (value?: unknown) => void = () => { };
            const task = jest.fn().mockImplementation(() => new Promise((resolve) => {
                resolveTask = resolve;
            }));

            pollingManager.start('test-id', task, 1000);
            await Promise.resolve();

            // La tarea está pendiente
            expect(task).toHaveBeenCalledTimes(1);

            pollingManager.stop('test-id');
            resolveTask();

            await Promise.resolve();
            await Promise.resolve();

            jest.advanceTimersByTime(1000);
            await Promise.resolve();

            expect(task).toHaveBeenCalledTimes(1);
        });

        it('debería salir si el ID se detiene inmediatamente después de iniciar', async () => {
            const task = jest.fn().mockResolvedValue(undefined);
            pollingManager.start('test-id', task, 1000);
            pollingManager.stop('test-id');

            await Promise.resolve();
            await Promise.resolve();

            expect(task).not.toHaveBeenCalled();
        });

        it('debería usar el nuevo intervalo si se actualiza', async () => {
            const task = jest.fn().mockResolvedValue(undefined);
            pollingManager.start('test-id', task, 1000);

            await Promise.resolve(); // Completa la primera ejecución
            await Promise.resolve();

            // Cambiar intervalo
            pollingManager.start('test-id', task, 2000);

            jest.advanceTimersByTime(1000);
            await Promise.resolve();
            expect(task).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(1000);
            await Promise.resolve();
            await Promise.resolve();
            expect(task).toHaveBeenCalledTimes(2);
        });
    });

    describe('stopAll', () => {
        it('debería detener todas las tareas activas', async () => {
            const task1 = jest.fn().mockResolvedValue(undefined);
            const task2 = jest.fn().mockResolvedValue(undefined);

            pollingManager.start('task1', task1, 1000);
            pollingManager.start('task2', task2, 1000);
            await Promise.resolve();

            pollingManager.stopAll();

            jest.advanceTimersByTime(1000);
            await Promise.resolve();

            expect(task1).toHaveBeenCalledTimes(1);
            expect(task2).toHaveBeenCalledTimes(1);
            expect(pollingManager.isRunning('task1')).toBe(false);
            expect(pollingManager.isRunning('task2')).toBe(false);
        });
    });
});
