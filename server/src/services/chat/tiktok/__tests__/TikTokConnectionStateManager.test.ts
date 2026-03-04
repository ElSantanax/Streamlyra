import { TikTokConnectionStateManager } from '../TikTokConnectionStateManager';
import { TikTokLiveConnection } from 'tiktok-live-connector';

describe('TikTokConnectionStateManager', () => {
    let stateManager: TikTokConnectionStateManager;
    const userId = 'user123';

    beforeEach(() => {
        stateManager = new TikTokConnectionStateManager();
    });

    it('debe manejar el estado de conexión (isConnecting)', () => {
        expect(stateManager.isConnecting(userId)).toBe(false);
        stateManager.setConnecting(userId, true);
        expect(stateManager.isConnecting(userId)).toBe(true);
        stateManager.setConnecting(userId, false);
        expect(stateManager.isConnecting(userId)).toBe(false);
    });

    it('debe manejar la conexión activa y hasActiveConnection', () => {
        const mockConn = {} as TikTokLiveConnection;
        expect(stateManager.hasActiveConnection(userId)).toBe(false);
        expect(stateManager.getActiveConnection(userId)).toBeUndefined();

        stateManager.setActiveConnection(userId, mockConn);
        expect(stateManager.hasActiveConnection(userId)).toBe(true);
        expect(stateManager.getActiveConnection(userId)).toBe(mockConn);

        stateManager.removeActiveConnection(userId);
        expect(stateManager.hasActiveConnection(userId)).toBe(false);
        expect(stateManager.getActiveConnection(userId)).toBeUndefined();
    });

    it('debe manejar autoAttempts', () => {
        expect(stateManager.getAutoAttempts(userId)).toBe(0);
        stateManager.incrementAutoAttempts(userId);
        expect(stateManager.getAutoAttempts(userId)).toBe(1);

        // Verificar que persiste si ya existe el estado
        stateManager.incrementAutoAttempts(userId);
        expect(stateManager.getAutoAttempts(userId)).toBe(2);
    });

    it('debe manejar manualMode', () => {
        expect(stateManager.isManualMode(userId)).toBe(false);
        stateManager.setManualMode(userId, true);
        expect(stateManager.isManualMode(userId)).toBe(true);
    });

    it('debe manejar discovery cleanup', () => {
        const cleanup = jest.fn();
        stateManager.setDiscoveryCleanup(userId, cleanup);

        const secondCleanup = jest.fn();
        stateManager.setDiscoveryCleanup(userId, secondCleanup);

        expect(cleanup).toHaveBeenCalled(); // Llamado al sobreescribir

        stateManager.stopDiscoveryLoop(userId);
        expect(secondCleanup).toHaveBeenCalled();
    });

    it('debe manejar flowId', () => {
        expect(stateManager.getFlowId(userId)).toBeUndefined();
        stateManager.setFlowId(userId, 'flow-123');
        expect(stateManager.getFlowId(userId)).toBe('flow-123');
    });

    it('debe limpiar todo el estado con clearState', () => {
        const cleanup = jest.fn();
        stateManager.setDiscoveryCleanup(userId, cleanup);
        stateManager.setConnecting(userId, true);
        stateManager.setActiveConnection(userId, {} as TikTokLiveConnection);

        stateManager.clearState(userId);

        expect(cleanup).toHaveBeenCalled();
        expect(stateManager.isConnecting(userId)).toBe(false);
        expect(stateManager.hasActiveConnection(userId)).toBe(false);
        expect(stateManager.hasState(userId)).toBe(false);
    });
});
