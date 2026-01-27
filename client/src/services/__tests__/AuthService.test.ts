import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { authService } from '../AuthService';

describe('AuthService (Client)', () => {
    const originalLocation = window.location;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();

        // Mock window.location
        delete (window as any).location;
        window.location = {
            ...originalLocation,
            href: '',
            pathname: '/dashboard',
        } as any;

        // Mock console.warn para verificar logging
        vi.spyOn(console, 'warn').mockImplementation(() => { });

        // El servicio es un singleton, así que reseteamos su estado interno si es necesario
        // (En este caso isHandlingExpiry se resetea por timeout, pero para tests podemos usar vi.useFakeTimers)
        vi.useFakeTimers();
        (authService as any).isHandlingExpiry = false;
    });

    afterEach(() => {
        (window as any).location = originalLocation;
        vi.useRealTimers();
    });

    describe('handleSessionExpired', () => {
        it('debe limpiar localStorage cuando la sesión expira', () => {
            localStorage.setItem('user', JSON.stringify({ id: '1' }));
            localStorage.setItem('token', 'old-token');

            authService.handleSessionExpired();

            expect(localStorage.getItem('user')).toBeNull();
            expect(localStorage.getItem('token')).toBeNull();
        });

        it('debe loguear un aviso de sesión expirada', () => {
            authService.handleSessionExpired();
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Sesión expirada'));
        });

        it('debe redirigir a /login preservando la URL actual', () => {
            window.location.pathname = '/dashboard/settings';

            authService.handleSessionExpired();

            expect(window.location.href).toBe('/login?redirect=%2Fdashboard%2Fsettings');
        });

        it('debe ser idempotente (no ejecutar múltiples limpiezas simultáneas)', () => {
            authService.handleSessionExpired();
            authService.handleSessionExpired();

            // Solo debe haber logueado una vez a pesar de llamarlo dos veces
            expect(console.warn).toHaveBeenCalledTimes(1);
        });

        it('debe permitir resetear el flag después de 5 segundos', () => {
            authService.handleSessionExpired();
            expect(console.warn).toHaveBeenCalledTimes(1);

            // Adelantar el tiempo 5 segundos
            vi.advanceTimersByTime(5001);

            authService.handleSessionExpired();
            expect(console.warn).toHaveBeenCalledTimes(2);
        });
    });

    describe('clearLocalSession', () => {
        it('debe limpiar los datos de usuario y token de localStorage', () => {
            localStorage.setItem('user', JSON.stringify({ id: '1' }));
            localStorage.setItem('token', 'some-token');

            authService.clearLocalSession();

            expect(localStorage.getItem('user')).toBeNull();
            expect(localStorage.getItem('token')).toBeNull();
        });
    });
});
