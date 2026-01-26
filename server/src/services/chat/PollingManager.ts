export class PollingManager {
    private intervals: Map<string, NodeJS.Timeout> = new Map();

    start(id: string, task: () => Promise<void>, intervalMs: number = 60000) {
        this.stop(id);

        // Wrap task to handle errors
        const wrappedTask = async () => {
            try {
                await task();
            } catch (error) {
                // Log error but don't crash the polling
                console.error(`[PollingManager] Error in polling task ${id}:`, error);
            }
        };

        // Execute immediately
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

    stopAll() {
        this.intervals.forEach((interval) => clearInterval(interval));
        this.intervals.clear();
    }
}
