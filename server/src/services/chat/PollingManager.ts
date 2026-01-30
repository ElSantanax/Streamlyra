/** Gestor de polling genérico con manejo de errores y ejecución inmediata */

import { logger } from '../../utils/logger';

export class PollingManager {
    private intervals: Map<string, NodeJS.Timeout> = new Map();

    start(id: string, task: () => Promise<void>, intervalMs: number = 60000) {
        this.stop(id);

        const runTask = async () => {
            if (!this.isRunning(id)) return;

            try {
                await task();
            } catch (error) {
                logger.error({ err: error, pollingId: id }, 'Error in polling task');
            }

            // Programar la siguiente ejecución solo si sigue corriendo
            if (this.isRunning(id)) {
                const timeout = setTimeout(runTask, intervalMs);
                this.intervals.set(id, timeout);
            }
        };

        // Primera ejecución inmediata
        void runTask();
    }

    stop(id: string) {
        const timeout = this.intervals.get(id);
        if (timeout) {
            clearTimeout(timeout);
            this.intervals.delete(id);
        }
    }

    isRunning(id: string): boolean {
        return this.intervals.has(id);
    }

    stopAll() {
        this.intervals.forEach((timeout) => clearTimeout(timeout));
        this.intervals.clear();
    }
}
