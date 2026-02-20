export class SocketRegistry {
    private socketUserMap: Map<string, string> = new Map();
    private userSocketCount: Map<string, number> = new Map();

    register(socketId: string, userId: string): { isFirstSocket: boolean; currentCount: number } {
        const existingUserId = this.socketUserMap.get(socketId);

        if (existingUserId === userId) {
            const currentCount = this.userSocketCount.get(userId) || 1;
            return { isFirstSocket: currentCount === 1, currentCount };
        }

        if (existingUserId && existingUserId !== userId) {
            this.remove(socketId);
        }

        this.socketUserMap.set(socketId, userId);
        const currentCount = this.userSocketCount.get(userId) || 0;
        const isFirstSocket = currentCount === 0;
        const newCount = currentCount + 1;
        this.userSocketCount.set(userId, newCount);
        return { isFirstSocket, currentCount: newCount };
    }

    remove(socketId: string): { userId?: string; isLastSocket: boolean; remainingCount: number } {
        const userId = this.socketUserMap.get(socketId);
        if (!userId) {
            return { isLastSocket: false, remainingCount: 0 };
        }

        this.socketUserMap.delete(socketId);
        const currentCount = this.userSocketCount.get(userId) || 0;
        const newCount = Math.max(0, currentCount - 1);

        if (newCount === 0) {
            this.userSocketCount.delete(userId);
            return { userId, isLastSocket: true, remainingCount: 0 };
        }

        this.userSocketCount.set(userId, newCount);
        return { userId, isLastSocket: false, remainingCount: newCount };
    }

    getUserId(socketId: string): string | undefined {
        return this.socketUserMap.get(socketId);
    }

    hasUser(userId: string): boolean {
        return this.userSocketCount.has(userId);
    }

    rollbackRegistration(socketId: string, userId: string): { remainingCount: number } {
        this.socketUserMap.delete(socketId);
        const count = this.userSocketCount.get(userId) || 0;
        if (count > 0) {
            const newCount = count - 1;
            if (newCount === 0) {
                this.userSocketCount.delete(userId);
                return { remainingCount: 0 };
            } else {
                this.userSocketCount.set(userId, newCount);
                return { remainingCount: newCount };
            }
        }
        return { remainingCount: 0 };
    }
}