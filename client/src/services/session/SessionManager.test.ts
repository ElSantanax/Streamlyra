import { sessionManager } from './SessionManager';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('SessionManager', () => {
    const originalLocation = window.location;

    beforeEach(() => {
        vi.useFakeTimers();
        
        Object.defineProperty(window, 'location', {
            value: {
                pathname: '/app',
                href: ''
            },
            writable: true
        });
        
        sessionManager.setSessionExpiredHandler(null);
        // Reset private variable isHandlingExpiry
        Reflect.set(sessionManager, 'isHandlingExpiry', false);

        vi.spyOn(localStorage, 'removeItem');
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.useRealTimers();
        Object.defineProperty(window, 'location', {
            value: originalLocation,
            writable: true
        });
        vi.restoreAllMocks();
    });

    it('debería establecer el manejador de sesión expirada', () => {
        const handler = vi.fn();
        sessionManager.setSessionExpiredHandler(handler);
        expect(Reflect.get(sessionManager, 'onSessionExpired')).toBe(handler);
    });

    it('debería limpiar la sesión local', () => {
        sessionManager.clearLocalSession();
        expect(localStorage.removeItem).toHaveBeenCalledWith('user');
        expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });

    it('no debería manejar la expiración de sesión si ya lo está manejando', () => {
        Reflect.set(sessionManager, 'isHandlingExpiry', true);
        sessionManager.handleSessionExpired();
        expect(console.warn).not.toHaveBeenCalled();
    });

    it('no debería manejar la expiración de sesión si está en una ruta pública', () => {
        window.location.pathname = '/login';
        sessionManager.handleSessionExpired();
        expect(console.warn).not.toHaveBeenCalled();
        
        window.location.pathname = '/register';
        sessionManager.handleSessionExpired();
        expect(console.warn).not.toHaveBeenCalled();
        
        window.location.pathname = '/auth/callback';
        sessionManager.handleSessionExpired();
        expect(console.warn).not.toHaveBeenCalled();
    });

    it('debería llamar al manejador personalizado si se proporciona', () => {
        const handler = vi.fn();
        sessionManager.setSessionExpiredHandler(handler);
        
        sessionManager.handleSessionExpired();
        
        expect(console.warn).toHaveBeenCalledWith('Sesión expirada. Redirigiendo al login...');
        expect(localStorage.removeItem).toHaveBeenCalledWith('user');
        expect(handler).toHaveBeenCalledWith('/app');
        expect(window.location.href).toBe(''); // Should not use default redirect
    });

    it('debería usar la redirección por defecto si no se proporciona manejador', () => {
        sessionManager.handleSessionExpired();
        
        expect(console.warn).toHaveBeenCalledWith('Sesión expirada. Redirigiendo al login...');
        expect(localStorage.removeItem).toHaveBeenCalledWith('user');
        expect(window.location.href).toBe('/login?redirect=%2Fapp');
    });

    it('debería resetear isHandlingExpiry después de 5 segundos', () => {
        sessionManager.handleSessionExpired();
        expect(Reflect.get(sessionManager, 'isHandlingExpiry')).toBe(true);
        
        vi.advanceTimersByTime(5000);
        
        expect(Reflect.get(sessionManager, 'isHandlingExpiry')).toBe(false);
    });
});
