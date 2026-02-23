export class SentMessageCache {
    private cache = new Map<string, Map<string, NodeJS.Timeout>>();
    private readonly TTL_MS = 4000;
    private readonly MAX_ENTRIES = 1000;

    markAsSent(userId: string, message: string): void {
        if (this.size() >= this.MAX_ENTRIES) {
            this.evictOldest();
        }

        if (!this.cache.has(userId)) {
            this.cache.set(userId, new Map());
        }

        const userCache = this.cache.get(userId)!;

        const existingTimeout = userCache.get(message);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        const timeout = setTimeout(() => {
            userCache.delete(message);

            if (userCache.size === 0) {
                this.cache.delete(userId);
            }
        }, this.TTL_MS);

        userCache.set(message, timeout);
    }

    wasSentFromDashboard(userId: string, message: string): boolean {
        const userCache = this.cache.get(userId);
        return userCache ? userCache.has(message) : false;
    }

    private evictOldest(): void {
        const firstUserId = this.cache.keys().next().value;
        if (firstUserId) {
            const userCache = this.cache.get(firstUserId);
            if (userCache && userCache.size > 0) {
                const firstMessage = userCache.keys().next().value;
                if (firstMessage) {
                    const timeout = userCache.get(firstMessage);
                    if (timeout) clearTimeout(timeout);
                    userCache.delete(firstMessage);
                }

                if (userCache.size === 0) {
                    this.cache.delete(firstUserId);
                }
            } else {
                this.cache.delete(firstUserId);
            }
        }
    }

    clearUser(userId: string): void {
        const userCache = this.cache.get(userId);
        if (userCache) {
            userCache.forEach(timeout => clearTimeout(timeout));
            this.cache.delete(userId);
        }
    }

    clear(): void {
        this.cache.forEach(userCache => {
            userCache.forEach(timeout => clearTimeout(timeout));
        });
        this.cache.clear();
    }

    size(): number {
        let total = 0;
        this.cache.forEach(userCache => {
            total += userCache.size;
        });
        return total;
    }

    getMaxEntries(): number {
        return this.MAX_ENTRIES;
    }
}

export const sentMessageCache = new SentMessageCache();