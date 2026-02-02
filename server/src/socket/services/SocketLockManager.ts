/** Gestiona los bloqueos de conexión para evitar conexiones duplicadas a plataformas */

export class SocketLockManager {
    private connectingLocks: Map<string, Promise<void>> = new Map();

    /**
     * Obtiene la promesa de bloqueo actual para un usuario
     */
    getLock(userId: string): Promise<void> | undefined {
        return this.connectingLocks.get(userId);
    }

    /**
     * Establece un nuevo bloqueo para un usuario
     */
    setLock(userId: string, promise: Promise<void>): void {
        this.connectingLocks.set(userId, promise);
    }

    /**
     * Libera el bloqueo de un usuario
     */
    releaseLock(userId: string): void {
        this.connectingLocks.delete(userId);
    }
}
