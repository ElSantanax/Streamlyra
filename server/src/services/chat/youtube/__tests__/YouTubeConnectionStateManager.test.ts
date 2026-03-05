import { YouTubeConnectionStateManager } from '../YouTubeConnectionStateManager';
import { YouTubeChatPoller } from '../YouTubeChatPoller';
import { YouTubeViewerPoller } from '../YouTubeViewerPoller';
import { ConnectionService } from '../../../connection/ConnectionService';

jest.mock('../YouTubeChatPoller');
jest.mock('../YouTubeViewerPoller');

describe('YouTubeConnectionStateManager', () => {
    let stateManager: YouTubeConnectionStateManager;
    const userId = 'user_yt_1';

    beforeEach(() => {
        stateManager = new YouTubeConnectionStateManager({} as unknown as ConnectionService);
        jest.clearAllMocks();
    });

    it('debería manejar el estado de conexión (isConnecting)', () => {
        expect(stateManager.isConnecting(userId)).toBe(false);
        stateManager.setConnecting(userId, true);
        expect(stateManager.isConnecting(userId)).toBe(true);
        stateManager.setConnecting(userId, false);
        expect(stateManager.isConnecting(userId)).toBe(false);
    });

    it('debería cargar perezosamente y devolver pollers', () => {
        const chatPoller = stateManager.getChatPoller(userId);
        const viewerPoller = stateManager.getViewerPoller(userId);

        expect(chatPoller).toBeInstanceOf(YouTubeChatPoller);
        expect(viewerPoller).toBeInstanceOf(YouTubeViewerPoller);

        // Debería devolver la misma instancia
        expect(stateManager.getChatPoller(userId)).toBe(chatPoller);
    });

    it('debería manejar autoAttempts', () => {
        expect(stateManager.getAutoAttempts(userId)).toBe(0);
        stateManager.incrementAutoAttempts(userId);
        expect(stateManager.getAutoAttempts(userId)).toBe(1);
    });

    it('debería manejar manualMode', () => {
        expect(stateManager.isManualMode(userId)).toBe(false);
        stateManager.setManualMode(userId, true);
        expect(stateManager.isManualMode(userId)).toBe(true);
    });

    it('debería manejar la limpieza de descubrimiento', () => {
        const cleanup = jest.fn();
        stateManager.setDiscoveryCleanup(userId, cleanup);

        const secondCleanup = jest.fn();
        stateManager.setDiscoveryCleanup(userId, secondCleanup);
        expect(cleanup).toHaveBeenCalled(); // Debería llamar a la limpieza previa

        stateManager.stopDiscoveryLoop(userId);
        expect(secondCleanup).toHaveBeenCalled();
    });

    it('debería marcar como conectado y resetear intentos', () => {
        stateManager.incrementAutoAttempts(userId);
        stateManager.markAsConnected(userId);

        expect(stateManager.hasActiveConnection(userId)).toBe(true);
        expect(stateManager.getAutoAttempts(userId)).toBe(0);
    });

    it('debería establecer modo de espera', () => {
        const cleanup = jest.fn();
        stateManager.setDiscoveryCleanup(userId, cleanup);
        stateManager.setConnecting(userId, true);

        stateManager.setWaitingMode(userId);

        expect(cleanup).toHaveBeenCalled();
        expect(stateManager.isManualMode(userId)).toBe(true);
        expect(stateManager.hasActiveConnection(userId)).toBe(false);
        expect(stateManager.isConnecting(userId)).toBe(false);
    });

    it('debería limpiar el estado completamente', () => {
        const cleanup = jest.fn();
        stateManager.setDiscoveryCleanup(userId, cleanup);
        const chatPoller = stateManager.getChatPoller(userId);
        const viewerPoller = stateManager.getViewerPoller(userId);

        stateManager.markAsConnected(userId);
        stateManager.clearState(userId);

        expect(cleanup).toHaveBeenCalled();
        expect(chatPoller.stopPolling).toHaveBeenCalledWith(userId);
        expect(viewerPoller.stopPolling).toHaveBeenCalledWith(userId);
        expect(stateManager.hasActiveConnection(userId)).toBe(false);
    });
});
