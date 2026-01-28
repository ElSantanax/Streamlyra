/**
 * Session Manager
 * Responsabilidad: Gestionar el estado de la sesión local (localStorage) 
 * y manejar eventos de expiración.
 */

class SessionManager {
    private isHandlingExpiry = false;
    private onSessionExpired: ((currentPath: string) => void) | null = null;

    setSessionExpiredHandler(handler: ((currentPath: string) => void) | null) {
        this.onSessionExpired = handler;
    }

    /**
     * Maneja el evento de sesión expirada (401)
     */
    handleSessionExpired() {
        if (this.isHandlingExpiry) return;

        const path = window.location.pathname;
        const isPublicAuthRoute = path === '/login' || path === '/register' || path === '/auth/callback';
        if (isPublicAuthRoute) return;

        this.isHandlingExpiry = true;
        console.warn('Sesión expirada detectada. Limpiando datos locales...');

        // Limpiar localStorage (datos residuales del usuario)
        this.clearLocalSession();

        const currentPath = window.location.pathname;
        if (this.onSessionExpired) {
            this.onSessionExpired(currentPath);
        } else {
            window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }

        // Resetear flag después de un tiempo prudencial (evitar loops infinitos inmediata)
        setTimeout(() => {
            this.isHandlingExpiry = false;
        }, 5000);
    }

    /**
     * Limpia el estado de autenticación local
     */
    clearLocalSession() {
        localStorage.removeItem('user');
        localStorage.removeItem('token'); // Por compatibilidad si se usó anteriormente
    }
}

export const sessionManager = new SessionManager();
