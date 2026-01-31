import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { sessionManager } from '../SessionManager';

describe('SessionManager (Client)', () => {
    const originalLocation = window.location;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();

        // Mock window.location
        delete (window as unknown as { location: unknown }).location;
        (window as unknown as { location: Location }).location = {
            ...originalLocation,
            href: '',
            pathname: '/dashboard',
        } as Location;

        // Mock console.warn para verificar logging
        vi.spyOn(console, 'warn').mockImplementation(() => { });

        // El servicio es un singleton, así que reseteamos su estado interno
        vi.useFakeTimers();
        (sessionManager as unknown as { isHandlingExpiry: boolean }).isHandlingExpiry = false;
    });

    afterEach(() => {
        (window as unknown as { location: Location }).location = originalLocation;
        vi.useRealTimers();
    });

    describe('handleSessionExpired', () => {
        it('debe limpiar localStorage cuando la sesión expira', () => {
            localStorage.setItem('user', JSON.stringify({ id: '1' }));
            localStorage.setItem('token', 'old-token');

            sessionManager.handleSessionExpired();

            expect(localStorage.getItem('user')).toBeNull();
            expect(localStorage.getItem('token')).toBeNull();
        });

        it('debe loguear un aviso de sesión expirada', () => {
            sessionManager.handleSessionExpired();
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Sesión expirada'));
        });

        it('debe redirigir a /login preservando la URL actual', () => {
            window.location.pathname = '/dashboard/settings';

            sessionManager.handleSessionExpired();

            expect(window.location.href).toBe('/login?redirect=%2Fdashboard%2Fsettings');
        });

        it('debe ser idempotente (no ejecutar múltiples limpiezas simultáneas)', () => {
            sessionManager.handleSessionExpired();
            sessionManager.handleSessionExpired();

            // Solo debe haber logueado una vez a pesar de llamarlo dos veces
            expect(console.warn).toHaveBeenCalledTimes(1);
        });

        it('debe permitir resetear el flag después de 5 segundos', () => {
            sessionManager.handleSessionExpired();
            expect(console.warn).toHaveBeenCalledTimes(1);

            // Adelantar el tiempo 5 segundos
            vi.advanceTimersByTime(5001);

            sessionManager.handleSessionExpired();
            expect(console.warn).toHaveBeenCalledTimes(2);
        });
    });

    describe('clearLocalSession', () => {
        it('debe limpiar los datos de usuario y token de localStorage', () => {
            localStorage.setItem('user', JSON.stringify({ id: '1' }));
            localStorage.setItem('token', 'some-token');

            sessionManager.clearLocalSession();

            expect(localStorage.getItem('user')).toBeNull();
            expect(localStorage.getItem('token')).toBeNull();
        });
    });
});
