import { logger } from '../../../utils/logger';

export class PollingManager {
    private intervals: Map<string, NodeJS.Timeout> = new Map();
    private intervalMsMap: Map<string, number> = new Map();
    private activeIds: Set<string> = new Set();

    start(id: string, task: () => Promise<void>, intervalMs: number = 60000) {
        const alreadyRunning = this.activeIds.has(id);
        const oldInterval = this.intervalMsMap.get(id);
        this.intervalMsMap.set(id, intervalMs);

        if (alreadyRunning) {
            // Si el intervalo cambió, reprogramamos el siguiente tick
            if (oldInterval !== intervalMs) {
                const timeout = this.intervals.get(id);
                if (timeout) {
                    clearTimeout(timeout);
                    this.intervals.delete(id);

                    const runNext = async () => {
                        if (!this.activeIds.has(id)) return;
                        try {
                            await task();
                        } catch (error) {
                            logger.error({ err: error, pollingId: id }, 'Error in polling task');
                        }
                        if (this.activeIds.has(id)) {
                            const currentInterval = this.intervalMsMap.get(id) || intervalMs;
                            const nextTimeout = setTimeout(runNext, currentInterval);
                            this.intervals.set(id, nextTimeout);
                        }
                    };
                    const nextTimeout = setTimeout(runNext, intervalMs);
                    this.intervals.set(id, nextTimeout);
                }
            }
            return;
        }

        this.activeIds.add(id);

        const runTask = async () => {
            if (!this.activeIds.has(id)) return;

            try {
                await task();
            } catch (error) {
                logger.error({ err: error, pollingId: id }, 'Error in polling task');
            }

            if (this.activeIds.has(id)) {
                const currentInterval = this.intervalMsMap.get(id) || intervalMs;
                const timeout = setTimeout(runTask, currentInterval);
                this.intervals.set(id, timeout);
            }
        };

        // Pequeño delay para permitir que stop() síncrono cancele la primera ejecución si se llama justo después
        void Promise.resolve().then(() => runTask());
    }

    stop(id: string) {
        this.activeIds.delete(id);
        const timeout = this.intervals.get(id);
        if (timeout) {
            clearTimeout(timeout);
            this.intervals.delete(id);
        }
        this.intervalMsMap.delete(id);
    }

    isRunning(id: string): boolean {
        return this.activeIds.has(id);
    }

    stopAll() {
        this.activeIds.clear();
        this.intervals.forEach((timeout) => clearTimeout(timeout));
        this.intervals.clear();
        this.intervalMsMap.clear();
    }
}