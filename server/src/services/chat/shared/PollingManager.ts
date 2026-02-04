/** Gestor de polling genérico con manejo de errores y ejecución inmediata */

import { logger } from '../../../utils/logger';

export class PollingManager {
    private intervals: Map<string, NodeJS.Timeout> = new Map();
    private intervalMsMap: Map<string, number> = new Map();

    start(id: string, task: () => Promise<void>, intervalMs: number = 60000) {
        const isUpdate = this.intervals.has(id);
        this.intervalMsMap.set(id, intervalMs);

        if (isUpdate) {
            // Si ya existe, solo actualizamos el intervalo para la próxima ejecución
            // No detenemos para evitar interrumpir tareas en curso o causar bucles
            return;
        }

        const runTask = async () => {
            if (!this.isRunning(id)) return;

            try {
                await task();
            } catch (error) {
                logger.error({ err: error, pollingId: id }, 'Error in polling task');
            }

            // Programar la siguiente ejecución solo si sigue corriendo
            if (this.isRunning(id)) {
                const currentInterval = this.intervalMsMap.get(id) || intervalMs;
                const timeout = setTimeout(runTask, currentInterval);
                this.intervals.set(id, timeout);
            }
        };

        // Marcar como running (placeholder)
        this.intervals.set(id, setTimeout(() => { }, 0));

        // Primera ejecución inmediata
        void runTask();
    }

    stop(id: string) {
        const timeout = this.intervals.get(id);
        if (timeout) {
            clearTimeout(timeout);
            this.intervals.delete(id);
        }
        this.intervalMsMap.delete(id);
    }

    isRunning(id: string): boolean {
        return this.intervals.has(id);
    }

    stopAll() {
        this.intervals.forEach((timeout) => clearTimeout(timeout));
        this.intervals.clear();
    }
}
