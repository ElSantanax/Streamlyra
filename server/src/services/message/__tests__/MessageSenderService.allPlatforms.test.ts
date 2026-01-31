import { MessageSenderService } from '../MessageSenderService';
import { ConnectionService } from '../../connection/ConnectionService';
import { TwitchService } from '../../platforms/TwitchService';
import { YouTubeService } from '../../platforms/YouTubeService';
import { KickService } from '../../platforms/KickService';
import { Connection } from '../../../models/Connection.model';
import { sentMessageCache } from '../../../utils/SentMessageCache';

/**
 * Unit Tests for MessageSenderService - Send to All Connected Platforms
 * Feature: multi-platform-message-sending
 * 
 * Tests that when platforms array is empty, messages are sent to all connected platforms
 */

jest.mock('../../../models/Connection.model');

describe('MessageSenderService - Send to All Connected Platforms', () => {
    let messageSenderService: MessageSenderService;
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let mockTwitchService: jest.Mocked<TwitchService>;
    let mockYouTubeService: jest.Mocked<YouTubeService>;
    let mockKickService: jest.Mocked<KickService>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockConnectionService = {
            getAllConnections: jest.fn(),
            getValidAccessToken: jest.fn()
        } as unknown as jest.Mocked<ConnectionService>;

        mockTwitchService = {
            sendChatMessage: jest.fn()
        } as unknown as jest.Mocked<TwitchService>;

        mockYouTubeService = {
            getActiveLiveChatId: jest.fn(),
            sendChatMessage: jest.fn()
        } as unknown as jest.Mocked<YouTubeService>;

        mockKickService = {
            sendChatMessage: jest.fn()
        } as unknown as jest.Mocked<KickService>;

        messageSenderService = new MessageSenderService(
            mockConnectionService,
            mockTwitchService,
            mockYouTubeService,
            mockKickService
        );
    });

    afterEach(() => {
        sentMessageCache.clear();
    });

    it('should send to all connected platforms when platforms array is empty', async () => {
        const userId = 'user123';
        const message = 'Test message';

        // Mock user has 3 connections
        const mockConnections = [
            { provider: 'twitch', providerId: 'twitch123', username: 'user1', userId },
            { provider: 'youtube', providerId: 'youtube123', username: 'user1', userId },
            { provider: 'kick', providerId: 'kick123', username: 'user1', userId }
        ];

        mockConnectionService.getAllConnections.mockResolvedValue(mockConnections as unknown as Connection[]);

        // Mock Connection.findOne to return the appropriate connection based on where clause
        (Connection.findOne as jest.Mock).mockImplementation((options: { where?: { userId?: string; provider?: string } }) => {
            const { userId: queryUserId, provider } = options.where || {};
            const connection = mockConnections.find(c => 
                c.userId === queryUserId && c.provider === provider
            );
            return Promise.resolve(connection || null);
        });

        mockConnectionService.getValidAccessToken.mockResolvedValue('valid-token');
        mockTwitchService.sendChatMessage.mockResolvedValue(undefined);
        mockYouTubeService.getActiveLiveChatId.mockResolvedValue('live-chat-123');
        mockYouTubeService.sendChatMessage.mockResolvedValue(undefined);
        mockKickService.sendChatMessage.mockResolvedValue(undefined);

        // Send with empty platforms array
        const result = await messageSenderService.sendMessage({
            userId,
            message,
            platforms: [] // Empty array should trigger "send to all"
        });

        // Verify getAllConnections was called
        expect(mockConnectionService.getAllConnections).toHaveBeenCalledWith(userId);

        // Verify message was sent to all 3 platforms
        expect(result.results).toHaveLength(3);
        expect(result.results.every(r => r.success)).toBe(true);
        expect(result.success).toBe(true);

        // Verify each platform received the message
        expect(mockTwitchService.sendChatMessage).toHaveBeenCalled();
        expect(mockYouTubeService.sendChatMessage).toHaveBeenCalled();
        expect(mockKickService.sendChatMessage).toHaveBeenCalled();
    });

    it('should filter out tiktok even when fetching all connections', async () => {
        const userId = 'user123';
        const message = 'Test message';

        // Mock user has connections including tiktok
        const mockConnections = [
            { provider: 'twitch', providerId: 'twitch123', username: 'user1', userId },
            { provider: 'tiktok', providerId: 'tiktok123', username: 'user1', userId }
        ];

        mockConnectionService.getAllConnections.mockResolvedValue(mockConnections as unknown as Connection[]);

        // Mock Connection.findOne to return the appropriate connection based on where clause
        (Connection.findOne as jest.Mock).mockImplementation((options: { where?: { userId?: string; provider?: string } }) => {
            const { userId: queryUserId, provider } = options.where || {};
            const connection = mockConnections.find(c => 
                c.userId === queryUserId && c.provider === provider
            );
            return Promise.resolve(connection || null);
        });

        mockConnectionService.getValidAccessToken.mockResolvedValue('valid-token');
        mockTwitchService.sendChatMessage.mockResolvedValue(undefined);

        // Send with empty platforms array
        const result = await messageSenderService.sendMessage({
            userId,
            message,
            platforms: []
        });

        // Verify tiktok was filtered out
        expect(result.results).toHaveLength(1);
        expect(result.results[0].platform).toBe('twitch');
        expect(mockTwitchService.sendChatMessage).toHaveBeenCalled();
    });

    it('should still work with explicit platforms array (backward compatibility)', async () => {
        const userId = 'user123';
        const message = 'Test message';

        // Mock Connection.findOne with where clause
        (Connection.findOne as jest.Mock).mockImplementation((options: { where?: { userId?: string; provider?: string } }) => {
            const { userId: queryUserId, provider } = options.where || {};
            if (queryUserId === userId && provider === 'twitch') {
                return Promise.resolve({
                    provider: 'twitch',
                    providerId: 'twitch123',
                    username: 'user1',
                    userId
                });
            }
            return Promise.resolve(null);
        });

        mockConnectionService.getValidAccessToken.mockResolvedValue('valid-token');
        mockTwitchService.sendChatMessage.mockResolvedValue(undefined);

        // Send with explicit platforms array (old behavior)
        const result = await messageSenderService.sendMessage({
            userId,
            message,
            platforms: ['twitch']
        });

        // Verify getAllConnections was NOT called
        expect(mockConnectionService.getAllConnections).not.toHaveBeenCalled();

        // Verify message was sent to specified platform only
        expect(result.results).toHaveLength(1);
        expect(result.results[0].platform).toBe('twitch');
        expect(mockTwitchService.sendChatMessage).toHaveBeenCalled();
    });
});
