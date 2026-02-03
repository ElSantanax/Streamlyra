class SessionManager {
    private isHandlingExpiry = false;
    private onSessionExpired: ((currentPath: string) => void) | null = null;

    setSessionExpiredHandler(handler: ((currentPath: string) => void) | null) {
        this.onSessionExpired = handler;
    }

    handleSessionExpired() {
        if (this.isHandlingExpiry) return;

        const path = window.location.pathname;
        const isPublicAuthRoute = path === '/login' || path === '/register' || path === '/auth/callback';
        if (isPublicAuthRoute) return;

        this.isHandlingExpiry = true;

        this.clearLocalSession();

        const currentPath = window.location.pathname;
        if (this.onSessionExpired) {
            this.onSessionExpired(currentPath);
        } else {
            window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }

        setTimeout(() => {
            this.isHandlingExpiry = false;
        }, 5000);
    }

    clearLocalSession() {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    }
}

export const sessionManager = new SessionManager();