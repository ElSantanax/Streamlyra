export class SocketLockManager {
    private connectingLocks: Map<string, Promise<void>> = new Map();

    getLock(userId: string): Promise<void> | undefined {
        return this.connectingLocks.get(userId);
    }

    setLock(userId: string, promise: Promise<void>): void {
        this.connectingLocks.set(userId, promise);
    }

    releaseLock(userId: string): void {
        this.connectingLocks.delete(userId);
    }
}
