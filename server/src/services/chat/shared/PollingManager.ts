import { logger } from '../../../utils/logger';

export class PollingManager {
    private intervals: Map<string, NodeJS.Timeout> = new Map();
    private intervalMsMap: Map<string, number> = new Map();
    private activeIds: Set<string> = new Set();

    start(id: string, task: () => Promise<void>, intervalMs: number = 60000) {
        const alreadyRunning = this.activeIds.has(id);
        this.intervalMsMap.set(id, intervalMs);

        if (alreadyRunning) {
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

        void runTask();
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