import { StreamSessionManager } from '../StreamSessionManager';

describe('StreamSessionManager', () => {
    let manager: StreamSessionManager;

    beforeEach(() => {
        manager = StreamSessionManager.getInstance();
        manager.clearSession('user-1');
        manager.clearSession('user-2');
    });

    describe('getInstance', () => {
        it('debe retornar la misma instancia (singleton)', () => {
            const instance1 = StreamSessionManager.getInstance();
            const instance2 = StreamSessionManager.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe('updateLiveStatus', () => {
        it('debe iniciar sesión cuando una plataforma se pone en vivo', () => {
            const result = manager.updateLiveStatus('user-1', 'twitch', true);

            expect(result.isSessionActive).toBe(true);
            expect(result.startTime).toBeTruthy();
        });

        it('debe mantener sesión activa cuando múltiples plataformas están en vivo', () => {
            manager.updateLiveStatus('user-1', 'twitch', true);
            const result = manager.updateLiveStatus('user-1', 'youtube', true);

            expect(result.isSessionActive).toBe(true);
            expect(result.startTime).toBeTruthy();
        });

        it('debe finalizar sesión cuando todas las plataformas se desconectan', () => {
            manager.updateLiveStatus('user-1', 'twitch', true);
            manager.updateLiveStatus('user-1', 'youtube', true);
            manager.updateLiveStatus('user-1', 'twitch', false);
            const result = manager.updateLiveStatus('user-1', 'youtube', false);

            expect(result.isSessionActive).toBe(false);
            expect(result.startTime).toBeNull();
        });

        it('no debe finalizar sesión si aún hay plataformas en vivo', () => {
            manager.updateLiveStatus('user-1', 'twitch', true);
            manager.updateLiveStatus('user-1', 'youtube', true);
            const result = manager.updateLiveStatus('user-1', 'twitch', false);

            expect(result.isSessionActive).toBe(true);
            expect(result.startTime).toBeTruthy();
        });
    });

    describe('getSession', () => {
        it('debe retornar sesión inactiva para usuario sin sesión', () => {
            const result = manager.getSession('user-1');

            expect(result.isSessionActive).toBe(false);
            expect(result.startTime).toBeNull();
        });

        it('debe retornar sesión activa para usuario en vivo', () => {
            manager.updateLiveStatus('user-1', 'twitch', true);
            const result = manager.getSession('user-1');

            expect(result.isSessionActive).toBe(true);
            expect(result.startTime).toBeTruthy();
        });
    });

    describe('isPlatformLive', () => {
        it('debe retornar true cuando la plataforma está en vivo', () => {
            manager.updateLiveStatus('user-1', 'twitch', true);

            expect(manager.isPlatformLive('user-1', 'twitch')).toBe(true);
        });

        it('debe retornar false cuando la plataforma no está en vivo', () => {
            expect(manager.isPlatformLive('user-1', 'twitch')).toBe(false);
        });
    });

    describe('clearSession', () => {
        it('debe limpiar la sesión del usuario', () => {
            manager.updateLiveStatus('user-1', 'twitch', true);
            manager.clearSession('user-1');
            const result = manager.getSession('user-1');

            expect(result.isSessionActive).toBe(false);
            expect(result.startTime).toBeNull();
        });
    });
});
