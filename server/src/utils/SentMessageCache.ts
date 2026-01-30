/** Caché de mensajes enviados desde el dashboard para prevenir ecos */

export class SentMessageCache {
    private cache = new Map<string, Map<string, NodeJS.Timeout>>();
    private readonly TTL_MS = 8000; // 8 segundos para dar tiempo a que llegue el eco
    private readonly MAX_ENTRIES = 1000; // Límite máximo de entradas totales para prevenir memory leaks

    /**
     * Marca un mensaje como enviado desde el dashboard
     * Se auto-limpia después del TTL
     */
    markAsSent(userId: string, message: string): void {
        // Verificar límite antes de agregar
        if (this.size() >= this.MAX_ENTRIES) {
            this.evictOldest();
        }

        if (!this.cache.has(userId)) {
            this.cache.set(userId, new Map());
        }

        const userCache = this.cache.get(userId)!;
        
        // Si ya existe un timeout para este mensaje, cancelarlo
        const existingTimeout = userCache.get(message);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Crear nuevo timeout para auto-limpiar
        const timeout = setTimeout(() => {
            userCache.delete(message);
            
            // Si el usuario no tiene más mensajes en caché, eliminar su entrada
            if (userCache.size === 0) {
                this.cache.delete(userId);
            }
        }, this.TTL_MS);

        userCache.set(message, timeout);
    }

    /**
     * Verifica si un mensaje fue enviado recientemente desde el dashboard
     */
    wasSentFromDashboard(userId: string, message: string): boolean {
        const userCache = this.cache.get(userId);
        return userCache ? userCache.has(message) : false;
    }

    /**
     * Elimina la entrada más antigua cuando se alcanza el límite
     * Estrategia: eliminar el primer usuario del Map (FIFO)
     */
    private evictOldest(): void {
        const firstUserId = this.cache.keys().next().value;
        if (firstUserId) {
            this.clearUser(firstUserId);
        }
    }

    /**
     * Limpia todos los mensajes de un usuario
     */
    clearUser(userId: string): void {
        const userCache = this.cache.get(userId);
        if (userCache) {
            // Cancelar todos los timeouts
            userCache.forEach(timeout => clearTimeout(timeout));
            this.cache.delete(userId);
        }
    }

    /**
     * Limpia todo el caché
     */
    clear(): void {
        this.cache.forEach(userCache => {
            userCache.forEach(timeout => clearTimeout(timeout));
        });
        this.cache.clear();
    }

    /**
     * Obtiene el tamaño del caché (para testing/debugging)
     */
    size(): number {
        let total = 0;
        this.cache.forEach(userCache => {
            total += userCache.size;
        });
        return total;
    }

    /**
     * Obtiene el límite máximo de entradas
     */
    getMaxEntries(): number {
        return this.MAX_ENTRIES;
    }
}

// Singleton para usar en toda la aplicación
export const sentMessageCache = new SentMessageCache();
