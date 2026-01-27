class AuthService {
    private isHandlingExpiry = false;

    /**
     * Maneja el evento de sesión expirada (401)
     */
    handleSessionExpired() {
        if (this.isHandlingExpiry) return;

        this.isHandlingExpiry = true;
        console.warn('Sesión expirada detectada. Limpiando datos locales...');

        // Limpiar localStorage (datos residuales del usuario)
        localStorage.removeItem('user');
        localStorage.removeItem('token'); // Por si acaso queda algo

        // Recargar para forzar redirección de ProtectedRoute
        // o redirigir manualmente si es necesario
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;

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
        localStorage.removeItem('token');
    }
}

export const authService = new AuthService();
