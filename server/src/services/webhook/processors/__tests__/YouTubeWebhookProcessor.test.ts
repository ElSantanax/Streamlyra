import { YouTubeWebhookProcessor } from '../YouTubeWebhookProcessor';
import { ChatManager } from '../../../core/ChatManager';
import { YouTubePubSubParser } from '../../../chat/youtube/YouTubePubSubParser';
import { Connection } from '../../../../models/Connection.model';
import { logger } from '../../../../utils/logger';

jest.mock('../../../chat/youtube/YouTubePubSubParser');
jest.mock('../../../../models/Connection.model');
jest.mock('../../../../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('YouTubeWebhookProcessor', () => {
    let youtubeWebhookProcessor: YouTubeWebhookProcessor;
    let mockChatManager: jest.Mocked<ChatManager>;

    beforeEach(() => {
        mockChatManager = {
            boostProviderDiscovery: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<ChatManager>;

        youtubeWebhookProcessor = new YouTubeWebhookProcessor(mockChatManager);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe registrar un aviso si no se puede parsear la notificación', async () => {
        const payload = { channelId: 'ch123', xmlBody: '<xml>' };
        (YouTubePubSubParser.parseNotification as jest.Mock).mockReturnValue(null);

        await youtubeWebhookProcessor.process(payload);

        expect(YouTubePubSubParser.parseNotification).toHaveBeenCalledWith('<xml>');
        expect(logger.warn).toHaveBeenCalledWith({ channelId: 'ch123' }, expect.stringContaining('No se pudo parsear'));
    });

    it('debe registrar un aviso si no hay conexiones activas para el canal', async () => {
        const payload = { channelId: 'ch123', xmlBody: '<xml>' };
        const mockNotification = { channelId: 'ch123', videoId: 'vid1', title: 'test' };
        (YouTubePubSubParser.parseNotification as jest.Mock).mockReturnValue(mockNotification);
        (Connection.findAll as jest.Mock).mockResolvedValue([]);

        await youtubeWebhookProcessor.process(payload);

        expect(Connection.findAll).toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalledWith({ channelId: 'ch123' }, expect.stringContaining('No hay usuarios activos'));
    });

    it('debe disparar boostProviderDiscovery para cada conexión encontrada', async () => {
        const payload = { channelId: 'ch123', xmlBody: '<xml>' };
        const mockNotification = { channelId: 'ch123', videoId: 'vid1', title: 'test' };
        const mockConnections = [{ userId: 'user1' }, { userId: 'user2' }];

        (YouTubePubSubParser.parseNotification as jest.Mock).mockReturnValue(mockNotification);
        (Connection.findAll as jest.Mock).mockResolvedValue(mockConnections);

        await youtubeWebhookProcessor.process(payload);

        expect(mockChatManager.boostProviderDiscovery).toHaveBeenCalledTimes(2);
        expect(mockChatManager.boostProviderDiscovery).toHaveBeenCalledWith('user1', 'youtube');
        expect(mockChatManager.boostProviderDiscovery).toHaveBeenCalledWith('user2', 'youtube');
    });

    it('debe manejar errores fatales', async () => {
        const payload = { channelId: 'ch123', xmlBody: '<xml>' };
        (YouTubePubSubParser.parseNotification as jest.Mock).mockImplementation(() => {
            throw new Error('Parse error');
        });

        await youtubeWebhookProcessor.process(payload);

        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({ err: expect.any(Error), channelId: 'ch123' }),
            expect.stringContaining('Error procesando notificación')
        );
    });
});
