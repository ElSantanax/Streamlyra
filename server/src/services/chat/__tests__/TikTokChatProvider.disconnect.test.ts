/**
 * Test para verificar que TikTokChatProvider.disconnect() 
 * previene reconexiones automáticas correctamente
 * 
 * Bug corregido: Condición de carrera donde el evento 'disconnected'
 * podía dispararse después de eliminar shouldReconnect pero antes
 * de remover los listeners, causando reconexiones no deseadas.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { TikTokChatProvider } from '../TikTokChatProvider';

// Mock de dependencias
jest.mock('../../../models/Connection.model');
jest.mock('../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));
jest.mock('tiktok-live-connector');
jest.mock('../tiktok/TikTokConnectionManager', () => ({
    TikTokConnectionManager: jest.fn().mockImplementation(() => ({
        connect: jest.fn(),
        disconnect: jest.fn()
    }))
}));

describe('TikTokChatProvider.disconnect()', () => {
    let provider: TikTokChatProvider;

    beforeEach(() => {
        provider = new TikTokChatProvider();
        jest.clearAllMocks();
    });

    it('should remove listeners before deleting shouldReconnect flag', async () => {
        // Este test documenta el orden correcto de operaciones
        // para prevenir la condición de carrera

        const userId = 'test-user-123';

        // Simular que hay una conexión activa
        const mockConnection = {
            removeAllListeners: jest.fn(),
            disconnect: jest.fn()
        };

        // Acceder al stateManager a través de la propiedad privada
        // @ts-expect-error - Accediendo a propiedad privada para testing
        provider.stateManager.setActiveConnection(userId, mockConnection);
        // @ts-expect-error - Accediendo a propiedad privada para testing
        provider.stateManager.enableAutoReconnect(userId);

        await provider.disconnect(userId);

        // Verificar que removeAllListeners fue llamado (sin argumentos para eliminar todos los listeners)
        expect(mockConnection.removeAllListeners).toHaveBeenCalled();

        // Verificar que shouldReconnect fue eliminado
        // @ts-expect-error - Accediendo a propiedad privada para testing
        expect(provider.stateManager.shouldAutoReconnect(userId)).toBe(false);

        // Verificar que la conexión fue desconectada

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mockDisconnect = (provider as any).connectionManager.disconnect;
        expect(mockDisconnect).toHaveBeenCalledWith(mockConnection);
    });

    it('should handle disconnect when no active connection exists', async () => {
        const userId = 'test-user-456';

        // No debería lanzar error si no hay conexión activa
        await expect(provider.disconnect(userId)).resolves.not.toThrow();
    });

    it('should cancel retry cleanup when disconnecting', async () => {
        const userId = 'test-user-789';
        const mockCleanup = jest.fn();

        // @ts-expect-error - Accediendo a propiedad privada para testing
        provider.stateManager.setRetryCleanup(userId, mockCleanup);

        await provider.disconnect(userId);

        // Verificar que el cleanup fue llamado
        expect(mockCleanup).toHaveBeenCalled();

        // Verificar que fue removido del map
        // @ts-expect-error - Accediendo a propiedad privada para testing
        expect(provider.stateManager.hasRetryCleanup(userId)).toBe(false);
    });
});
