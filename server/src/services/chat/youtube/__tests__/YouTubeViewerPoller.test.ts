import axios from 'axios';
import { Server } from 'socket.io';
import { YouTubeViewerPoller } from '../YouTubeViewerPoller';
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

describe('YouTubeViewerPoller', () => {
    let poller: YouTubeViewerPoller;
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let mockQuotaManager: jest.Mocked<YouTubeQuotaManager>;
    let mockIo: jest.Mocked<Server>;

    const userId = 'user_yt_poller_viewers';
    const videoId = 'video_id_1';

    beforeEach(() => {
        mockConnectionService = {
            getValidAccessToken: jest.fn().mockResolvedValue('fake-access-token')
        } as unknown as jest.Mocked<ConnectionService>;

        mockQuotaManager = {
            hasQuota: jest.fn().mockResolvedValue(true),
            consumeQuota: jest.fn().mockResolvedValue(undefined),
            markAsExhausted: jest.fn().mockResolvedValue(undefined)
        } as unknown as jest.Mocked<YouTubeQuotaManager>;

        (YouTubeQuotaManager.getInstance as jest.Mock).mockReturnValue(mockQuotaManager);

        mockIo = {} as unknown as jest.Mocked<Server>;

        poller = new YouTubeViewerPoller(mockConnectionService);

        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('debería obtener y emitir el contador de espectadores', async () => {
        const mockResponse = {
            data: {
                items: [
                    { liveStreamingDetails: { concurrentViewers: '50' } }
                ]
            }
        };
        (axios.get as jest.Mock).mockResolvedValue(mockResponse);

        await poller.startPolling(userId, videoId, mockIo);

        for (let i = 0; i < 10; i++) await Promise.resolve();

        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('videos'), expect.any(Object));
        expect(SafeSocketEmitter.emitViewersUpdate).toHaveBeenCalled();
        expect(mockQuotaManager.consumeQuota).toHaveBeenCalled();
    });

    it('debería manejar error 404 (stream offline)', async () => {
        const error404 = {
            isAxiosError: true,
            response: { status: 404 }
        };
        (axios.get as jest.Mock).mockRejectedValue(error404);
        (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

        await poller.startPolling(userId, videoId, mockIo);

        for (let i = 0; i < 10; i++) await Promise.resolve();

        expect(YouTubeStreamContext.update).toHaveBeenCalledWith(
            { isActive: false, endedAt: expect.any(Date) },
            { where: { videoId, isActive: true } }
        );
        expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(
            mockIo, userId, 'youtube', 'waiting_stream', 'Stream finalizado'
        );
    });

    it('debería detener el polling correctamente', async () => {
        await poller.startPolling(userId, videoId, mockIo);

        for (let i = 0; i < 5; i++) await Promise.resolve();

        poller.stopPolling(userId);
        (axios.get as jest.Mock).mockClear();

        jest.advanceTimersByTime(200000);
        for (let i = 0; i < 5; i++) await Promise.resolve();

        expect(axios.get).not.toHaveBeenCalled();
    });
});
