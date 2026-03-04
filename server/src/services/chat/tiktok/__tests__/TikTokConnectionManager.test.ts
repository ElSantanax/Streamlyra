import { TikTokConnectionManager } from '../TikTokConnectionManager';
import { TikTokLiveConnection } from 'tiktok-live-connector';
import { logger } from '../../../../utils/logger';

jest.mock('tiktok-live-connector');
jest.mock('../../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    }
}));

describe('TikTokConnectionManager', () => {
    let manager: TikTokConnectionManager;
    let mockTikTokLiveConnection: jest.Mocked<TikTokLiveConnection>;

    beforeEach(() => {
        manager = new TikTokConnectionManager();

        mockTikTokLiveConnection = {
            connect: jest.fn(),
            disconnect: jest.fn(),
        } as unknown as jest.Mocked<TikTokLiveConnection>;

        (TikTokLiveConnection as jest.Mock).mockImplementation(() => mockTikTokLiveConnection);

        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('connect', () => {
        it('debe conectar exitosamente si el room_info devuelve status 2 y resuelve antes del timeout', async () => {
            mockTikTokLiveConnection.connect.mockResolvedValue({} as unknown as Awaited<ReturnType<typeof mockTikTokLiveConnection.connect>>);
            (mockTikTokLiveConnection as unknown as { getRoomInfo: jest.Mock }).getRoomInfo = jest.fn().mockReturnValue({ data: { status: 2 } });

            const promise = manager.connect('testuser');

            await expect(promise).resolves.toBe(mockTikTokLiveConnection);

            expect(TikTokLiveConnection).toHaveBeenCalledWith('testuser');
            expect(mockTikTokLiveConnection.connect).toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith({ username: 'testuser' }, 'Connected to TikTok');
        });

        it('debe conectar exitosamente usando roomInfo property fallback', async () => {
            mockTikTokLiveConnection.connect.mockResolvedValue({} as unknown as Awaited<ReturnType<typeof mockTikTokLiveConnection.connect>>);
            // Sin getRoomInfo, usamos la propiedad directa
            Object.defineProperty(mockTikTokLiveConnection, 'roomInfo', {
                value: { status: 2 },
                configurable: true
            });

            await expect(manager.connect('testuser')).resolves.toBe(mockTikTokLiveConnection);
        });

        it('debe lanzar error de timeout si la conexion demora demasiado', async () => {
            // Simulamos que el connect nunca resuelve
            mockTikTokLiveConnection.connect.mockImplementation(() => new Promise(() => { }));

            const promise = manager.connect('testuser');

            jest.advanceTimersByTime(30000); // Avanzar timeout

            await expect(promise).rejects.toThrow('Connection timeout');

            // Verifica que se haya llamado disconnect por fallar
            expect(mockTikTokLiveConnection.disconnect).toHaveBeenCalled();
        });

        it('debe lanzar LIVE_ACCESS_ROOM_ERROR si el status no es 2', async () => {
            mockTikTokLiveConnection.connect.mockResolvedValue({} as unknown as Awaited<ReturnType<typeof mockTikTokLiveConnection.connect>>);
            (mockTikTokLiveConnection as unknown as { getRoomInfo: jest.Mock }).getRoomInfo = jest.fn().mockReturnValue({ data: { status: 4 } });

            await expect(manager.connect('testuser')).rejects.toThrow('LIVE_ACCESS_ROOM_ERROR: User is not live');
            expect(mockTikTokLiveConnection.disconnect).toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith(
                expect.objectContaining({ status: 4 }),
                'TikTok: User is not live or room info invalid'
            );
        });

        it('debe propagar errores del underlying connect()', async () => {
            const networkError = new Error('Network fault');
            mockTikTokLiveConnection.connect.mockRejectedValue(networkError);

            await expect(manager.connect('testuser')).rejects.toThrow(networkError);
            expect(mockTikTokLiveConnection.disconnect).toHaveBeenCalled(); // Llamado the disconnect silenciado
        });
    });

    describe('disconnect', () => {
        it('debe desconectar la conexion subyacente', () => {
            manager.disconnect(mockTikTokLiveConnection);
            expect(mockTikTokLiveConnection.disconnect).toHaveBeenCalled();
        });

        it('debe loguear error si la desconexion falla (no silente)', () => {
            const err = new Error('disconnect failed');
            mockTikTokLiveConnection.disconnect.mockImplementation(() => { throw err; });

            manager.disconnect(mockTikTokLiveConnection);

            expect(logger.error).toHaveBeenCalledWith({ err }, 'Error disconnecting TikTok');
        });

        it('debe loguear debug si la desconexion falla (silente)', () => {
            const err = new Error('disconnect failed');
            mockTikTokLiveConnection.disconnect.mockImplementation(() => { throw err; });

            manager.disconnect(mockTikTokLiveConnection, true);

            expect(logger.debug).toHaveBeenCalledWith({ err }, 'Silent disconnect failed (expected during cleanup)');
        });
    });
});
