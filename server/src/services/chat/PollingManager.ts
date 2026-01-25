export class PollingManager {
    private intervals: Map<string, NodeJS.Timeout> = new Map();

    start(id: string, task: () => Promise<void>, intervalMs: number = 60000) {
        this.stop(id);

        // Execute immediately
        void task();

        const interval = setInterval(() => {
            void task();
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

    stopAll() {
        this.intervals.forEach((interval) => clearInterval(interval));
        this.intervals.clear();
    }
}
