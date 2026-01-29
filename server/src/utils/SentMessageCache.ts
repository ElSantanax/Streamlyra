/** Caché de mensajes enviados desde el dashboard para prevenir ecos */

export class SentMessageCache {
    private cache = new Map<string, Map<string, NodeJS.Timeout>>();
    private readonly TTL_MS = 8000; // 8 segundos para dar tiempo a que llegue el eco

    /**
     * Marca un mensaje como enviado desde el dashboard
     * Se auto-limpia después del TTL
     */
    markAsSent(userId: string, message: string): void {
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
}

// Singleton para usar en toda la aplicación
export const sentMessageCache = new SentMessageCache();
