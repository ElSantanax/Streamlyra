/** Gestiona el mapeo entre sockets y IDs de usuario y el conteo de conexiones */

export class SocketRegistry {
    private socketUserMap: Map<string, string> = new Map();
    private userSocketCount: Map<string, number> = new Map();

    /**
     * Registra un nuevo socket para un usuario
     */
    register(socketId: string, userId: string): { isFirstSocket: boolean; currentCount: number } {
        this.socketUserMap.set(socketId, userId);
        const currentCount = this.userSocketCount.get(userId) || 0;
        const isFirstSocket = currentCount === 0;
        const newCount = currentCount + 1;
        this.userSocketCount.set(userId, newCount);
        return { isFirstSocket, currentCount: newCount };
    }

    /**
     * Elimina un socket del registro
     */
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

    /**
     * Obtiene el userId asociado a un socketId
     */
    getUserId(socketId: string): string | undefined {
        return this.socketUserMap.get(socketId);
    }

    /**
     * Verifica si el usuario tiene algún socket activo
     */
    hasUser(userId: string): boolean {
        return this.userSocketCount.has(userId);
    }

    /**
     * Revierte el registro de un socket (usado en caso de error en el proceso de identificación)
     */
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
