import axios from 'axios';
import { Server } from 'socket.io';
import { YouTubeChatPoller } from '../YouTubeChatPoller';
import { ConnectionService } from '../../../connection/ConnectionService';
import { YouTubeQuotaManager } from '../../../platforms/YouTubeQuotaManager';
import { YouTubeStreamContext } from '../../../../models/YouTubeStreamContext.model';
import { SafeSocketEmitter } from '../../../../utils/SafeSocketEmitter';

jest.mock('axios');
jest.mock('../../../platforms/YouTubeQuotaManager');
jest.mock('../../../../models/YouTubeStreamContext.model');
jest.mock('../../../../utils/SafeSocketEmitter');
jest.mock('../../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    }
}));

describe('YouTubeChatPoller', () => {
    let poller: YouTubeChatPoller;
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let mockQuotaManager: jest.Mocked<YouTubeQuotaManager>;
    let mockIo: jest.Mocked<Server>;

    const userId = 'user_yt_poller';
    const liveChatId = 'chat_id_1';

    beforeEach(() => {
        mockConnectionService = {
            getValidAccessToken: jest.fn().mockResolvedValue('fake-access-token')
        } as unknown as jest.Mocked<ConnectionService>;

        mockQuotaManager = {
            hasQuota: jest.fn().mockResolvedValue(true),
            consumeQuota: jest.fn().mockResolvedValue(undefined),
            markAsExhausted: jest.fn().mockResolvedValue(undefined),
            getAdaptiveInterval: jest.fn().mockImplementation((val) => Promise.resolve(val))
        } as unknown as jest.Mocked<YouTubeQuotaManager>;

        (YouTubeQuotaManager.getInstance as jest.Mock).mockReturnValue(mockQuotaManager);

        mockIo = {} as unknown as jest.Mocked<Server>;

        poller = new YouTubeChatPoller(mockConnectionService);

        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('debería obtener y emitir mensajes si hay cuota disponible', async () => {
        const mockResponse = {
            data: {
                items: [
                    { id: 'msg1', snippet: { displayMessage: 'Hello', authorDetails: { displayName: 'User' } } }
                ],
                nextPageToken: 'next1',
                pollingIntervalMillis: 1000
            }
        };
        (axios.get as jest.Mock).mockResolvedValue(mockResponse);

        await poller.startPolling(userId, liveChatId, mockIo);

        // Esperar a que se resuelvan las microtareas
        for (let i = 0; i < 10; i++) await Promise.resolve();

        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('liveChat/messages'), expect.any(Object));
        expect(SafeSocketEmitter.emitChatMessage).toHaveBeenCalled();
        expect(mockQuotaManager.consumeQuota).toHaveBeenCalled();
    });

    it('debería reintentar si la cuota está agotada', async () => {
        mockQuotaManager.hasQuota.mockResolvedValue(false);

        await poller.startPolling(userId, liveChatId, mockIo);
        await Promise.resolve();

        expect(axios.get).not.toHaveBeenCalled();
    });

    it('debería actualizar el contexto y detenerse si hay un error 404 (stream offline)', async () => {
        const error404 = {
            isAxiosError: true,
            response: { status: 404 }
        };
        (axios.get as unknown as jest.Mock).mockImplementation(() => {
            return Promise.reject(error404);
        });
        (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

        await poller.startPolling(userId, liveChatId, mockIo);

        for (let i = 0; i < 10; i++) await Promise.resolve();

        expect(YouTubeStreamContext.update).toHaveBeenCalledWith(
            { isActive: false, endedAt: expect.any(Date) },
            { where: { liveChatId, isActive: true } }
        );
        expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(
            mockIo, userId, 'youtube', 'waiting_stream', 'Stream finalizado'
        );
    });

    it('debería detener el polling correctamente', async () => {
        await poller.startPolling(userId, liveChatId, mockIo);

        // Esperar a la primera llamada
        for (let i = 0; i < 5; i++) await Promise.resolve();

        poller.stopPolling(userId);
        (axios.get as jest.Mock).mockClear();

        jest.advanceTimersByTime(20000);
        for (let i = 0; i < 5; i++) await Promise.resolve();

        expect(axios.get).not.toHaveBeenCalled();
    });
});
