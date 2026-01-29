/** Gestor de polling genérico con manejo de errores y ejecución inmediata */

import { logger } from '../../utils/logger';

export class PollingManager {
    private intervals: Map<string, NodeJS.Timeout> = new Map();

    start(id: string, task: () => Promise<void>, intervalMs: number = 60000) {
        this.stop(id);

        const wrappedTask = async () => {
            try {
                await task();
            } catch (error) {
                logger.error({ err: error, pollingId: id }, 'Error in polling task');
            }
        };

        void wrappedTask();

        const interval = setInterval(() => {
            void wrappedTask();
        }, intervalMs);

        this.intervals.set(id, interval);
    }

    stop(id: string) {
        const interval = this.intervals.get(id);
        if (interval) {
            clearInterval(interval);
            this.intervals.delete(id);
        }
    }

    isRunning(id: string): boolean {
        return this.intervals.has(id);
    }

    stopAll() {
        this.intervals.forEach((interval) => clearInterval(interval));
        this.intervals.clear();
    }
}
