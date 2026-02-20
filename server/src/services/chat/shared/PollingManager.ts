import { logger } from '../../../utils/logger';

export class PollingManager {
    private intervals: Map<string, NodeJS.Timeout> = new Map();
    private intervalMsMap: Map<string, number> = new Map();

    start(id: string, task: () => Promise<void>, intervalMs: number = 60000) {
        const isUpdate = this.intervals.has(id);
        this.intervalMsMap.set(id, intervalMs);

        if (isUpdate) {
            return;
        }

        const runTask = async () => {
            if (!this.isRunning(id)) return;

            try {
                await task();
            } catch (error) {
                logger.error({ err: error, pollingId: id }, 'Error in polling task');
            }

            if (this.isRunning(id)) {
                const currentInterval = this.intervalMsMap.get(id) || intervalMs;
                const timeout = setTimeout(runTask, currentInterval);
                this.intervals.set(id, timeout);
            }
        };

        this.intervals.set(id, setTimeout(() => { }, 0));
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
        this.intervalMsMap.clear();
    }
}