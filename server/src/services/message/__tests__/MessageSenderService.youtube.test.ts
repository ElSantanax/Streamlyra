import { MessageSenderService } from '../MessageSenderService';
import { ConnectionService } from '../../connection/ConnectionService';
import { TwitchService } from '../../platforms/TwitchService';
import { YouTubeService } from '../../platforms/YouTubeService';
import { KickService } from '../../platforms/KickService';
import { Connection } from '../../../models/Connection.model';
import { sentMessageCache } from '../../../utils/SentMessageCache';

/**
 * Unit Tests for MessageSenderService - YouTube Edge Cases
 * Feature: multi-platform-message-sending
 * 
 * Tests edge cases for YouTube integration:
 * - No live broadcast
 * - liveChatId is null
 * - API quota error
 * 
 * Validates: Requirements 6.5
 */

// Mock Connection model
jest.mock('../../../models/Connection.model');

describe('MessageSenderService - YouTube Edge Cases', () => {
    let messageSenderService: MessageSenderService;
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let mockTwitchService: jest.Mocked<TwitchService>;
    let mockYouTubeService: jest.Mocked<YouTubeService>;
    let mockKickService: jest.Mocked<KickService>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mocks
        mockConnectionService = {
            getValidAccessToken: jest.fn()
        } as unknown as jest.Mocked<ConnectionService>;

        mockTwitchService = {} as unknown as jest.Mocked<TwitchService>;

        mockYouTubeService = {
            getActiveLiveChatId: jest.fn(),
            sendChatMessage: jest.fn()
        } as unknown as jest.Mocked<YouTubeService>;

        mockKickService = {} as unknown as jest.Mocked<KickService>;

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

    describe('No live broadcast', () => {
        it('should return NO_LIVE_BROADCAST error when no active broadcast exists', async () => {
            // Mock connection exists and token is valid
            const mockConnection = {
                userId: 'user123',
                provider: 'youtube',
                providerId: 'channel123',
                providerUsername: 'testchannel',
                save: jest.fn().mockResolvedValue(true)
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
            mockYouTubeService.getActiveLiveChatId.mockResolvedValue(null); // No live broadcast

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['youtube']
            });

            // Should attempt to get liveChatId but not send message
            expect(mockYouTubeService.getActiveLiveChatId).toHaveBeenCalledWith('valid_token');
            expect(mockYouTubeService.sendChatMessage).not.toHaveBeenCalled();

            // Should return error result
            expect(result.success).toBe(false);
            expect(result.results).toHaveLength(1);
            expect(result.results[0]).toEqual({
                platform: 'youtube',
                success: false,
                error: 'Sin Live activo',
                errorCode: 'NO_LIVE_BROADCAST'
            });
        });

        it('should continue with other platforms when YouTube has no live broadcast', async () => {
            // Mock connection exists but no live broadcast
            const mockConnection = {
                userId: 'user123',
                provider: 'youtube',
                providerId: 'channel123',
                providerUsername: 'testchannel',
                save: jest.fn().mockResolvedValue(true)
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
            mockYouTubeService.getActiveLiveChatId.mockResolvedValue(null);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['youtube', 'twitch', 'kick']
            });

            // All platforms should have results
            expect(result.results).toHaveLength(3);

            // YouTube should be marked as no live broadcast
            const youtubeResult = result.results.find(r => r.platform === 'youtube');
            expect(youtubeResult?.success).toBe(false);
            expect(youtubeResult?.errorCode).toBe('NO_LIVE_BROADCAST');

            // Other platforms should also have results
            expect(result.results.find(r => r.platform === 'twitch')).toBeDefined();
            expect(result.results.find(r => r.platform === 'kick')).toBeDefined();
        });
    });

    describe('liveChatId is null', () => {
        it('should handle null liveChatId from getActiveLiveChatId', async () => {
            // Mock connection exists and token is valid
            const mockConnection = {
                userId: 'user123',
                provider: 'youtube',
                providerId: 'channel123',
                providerUsername: 'testchannel',
                save: jest.fn().mockResolvedValue(true)
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
            mockYouTubeService.getActiveLiveChatId.mockResolvedValue(null);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['youtube']
            });

            // Should not attempt to send message with null liveChatId
            expect(mockYouTubeService.sendChatMessage).not.toHaveBeenCalled();

            // Should return NO_LIVE_BROADCAST error
            expect(result.results[0].errorCode).toBe('NO_LIVE_BROADCAST');
        });

        it('should handle empty string liveChatId as null', async () => {
            // Mock connection exists and token is valid
            const mockConnection = {
                userId: 'user123',
                provider: 'youtube',
                providerId: 'channel123',
                providerUsername: 'testchannel',
                save: jest.fn().mockResolvedValue(true)
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
            // Return null (empty liveChatId)
            mockYouTubeService.getActiveLiveChatId.mockResolvedValue(null);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['youtube']
            });

            // Should not send message
            expect(mockYouTubeService.sendChatMessage).not.toHaveBeenCalled();
            expect(result.results[0].success).toBe(false);
        });
    });

    describe('API quota error', () => {
        it('should return error when YouTube API quota is exceeded', async () => {
            // Mock successful connection and token
            const mockConnection = {
                userId: 'user123',
                provider: 'youtube',
                providerId: 'channel123',
                providerUsername: 'testchannel',
                save: jest.fn().mockResolvedValue(true)
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
            mockYouTubeService.getActiveLiveChatId.mockResolvedValue('livechat123');

            // Mock quota exceeded error
            const quotaError = new Error('Quota exceeded');
            (quotaError as { code?: string }).code = 'QUOTA_EXCEEDED';
            mockYouTubeService.sendChatMessage.mockRejectedValue(quotaError);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['youtube']
            });

            // Should attempt to send message
            expect(mockYouTubeService.sendChatMessage).toHaveBeenCalledWith(
                'valid_token',
                'livechat123',
                'Test message'
            );

            // Should return error result with quota error
            expect(result.success).toBe(false);
            expect(result.results).toHaveLength(1);
            expect(result.results[0].platform).toBe('youtube');
            expect(result.results[0].success).toBe(false);
            expect(result.results[0].error).toBe('Quota exceeded');
            expect(result.results[0].errorCode).toBe('QUOTA_EXCEEDED');
        });

        it('should continue with other platforms when YouTube quota is exceeded', async () => {
            // Mock successful connection and token for YouTube
            const mockConnection = {
                userId: 'user123',
                provider: 'youtube',
                providerId: 'channel123',
                providerUsername: 'testchannel',
                save: jest.fn().mockResolvedValue(true)
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
            mockYouTubeService.getActiveLiveChatId.mockResolvedValue('livechat123');

            // Mock YouTube quota error
            const quotaError = new Error('Quota exceeded');
            mockYouTubeService.sendChatMessage.mockRejectedValue(quotaError);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['youtube', 'twitch', 'kick']
            });

            // All platforms should have results
            expect(result.results).toHaveLength(3);

            // YouTube should be marked as failed
            const youtubeResult = result.results.find(r => r.platform === 'youtube');
            expect(youtubeResult?.success).toBe(false);
            expect(youtubeResult?.error).toBe('Quota exceeded');

            // Other platforms should also have results
            expect(result.results.find(r => r.platform === 'twitch')).toBeDefined();
            expect(result.results.find(r => r.platform === 'kick')).toBeDefined();
        });
    });

    describe('General API errors', () => {
        it('should handle generic YouTube API errors', async () => {
            // Mock successful connection and token
            const mockConnection = {
                userId: 'user123',
                provider: 'youtube',
                providerId: 'channel123',
                providerUsername: 'testchannel',
                save: jest.fn().mockResolvedValue(true)
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
            mockYouTubeService.getActiveLiveChatId.mockResolvedValue('livechat123');

            // Mock generic API error
            const apiError = new Error('Service unavailable');
            mockYouTubeService.sendChatMessage.mockRejectedValue(apiError);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['youtube']
            });

            // Should return error with message
            expect(result.results[0].error).toBe('Service unavailable');
            expect(result.results[0].errorCode).toBe('YOUTUBE_ERROR');
        });

        it('should handle API errors with custom error codes', async () => {
            // Mock successful connection and token
            const mockConnection = {
                userId: 'user123',
                provider: 'youtube',
                providerId: 'channel123',
                providerUsername: 'testchannel',
                save: jest.fn().mockResolvedValue(true)
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
            mockYouTubeService.getActiveLiveChatId.mockResolvedValue('livechat123');

            // Mock API error with custom code
            const apiError = new Error('Forbidden');
            (apiError as { code?: string }).code = 'FORBIDDEN';
            mockYouTubeService.sendChatMessage.mockRejectedValue(apiError);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['youtube']
            });

            // Should return error with custom code
            expect(result.results[0].error).toBe('Forbidden');
            expect(result.results[0].errorCode).toBe('FORBIDDEN');
        });

        it('should use default error code when API error has no code', async () => {
            // Mock successful connection and token
            const mockConnection = {
                userId: 'user123',
                provider: 'youtube',
                providerId: 'channel123',
                providerUsername: 'testchannel',
                save: jest.fn().mockResolvedValue(true)
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
            mockYouTubeService.getActiveLiveChatId.mockResolvedValue('livechat123');

            // Mock API error without code
            mockYouTubeService.sendChatMessage.mockRejectedValue(new Error('Unknown error'));

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['youtube']
            });

            // Should use default error code
            expect(result.results[0].error).toBe('Unknown error');
            expect(result.results[0].errorCode).toBe('YOUTUBE_ERROR');
        });
    });

    describe('Connection and token errors', () => {
        it('should return NOT_CONNECTED error when YouTube connection does not exist', async () => {
            // Mock no connection found
            (Connection.findOne as jest.Mock).mockResolvedValue(null);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['youtube']
            });

            // Should not attempt to get token or liveChatId
            expect(mockConnectionService.getValidAccessToken).not.toHaveBeenCalled();
            expect(mockYouTubeService.getActiveLiveChatId).not.toHaveBeenCalled();
            expect(mockYouTubeService.sendChatMessage).not.toHaveBeenCalled();

            // Should return error result
            expect(result.success).toBe(false);
            expect(result.results).toHaveLength(1);
            expect(result.results[0]).toEqual({
                platform: 'youtube',
                success: false,
                error: 'No conectado',
                errorCode: 'NOT_CONNECTED'
            });
        });

        it('should return INVALID_TOKEN error when token cannot be obtained', async () => {
            // Mock connection exists but token is invalid
            const mockConnection = {
                userId: 'user123',
                provider: 'youtube',
                providerId: 'channel123',
                providerUsername: 'testchannel',
                save: jest.fn().mockResolvedValue(true)
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue(null);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['youtube']
            });

            // Should attempt to get token but not get liveChatId
            expect(mockConnectionService.getValidAccessToken).toHaveBeenCalledWith('user123', 'youtube');
            expect(mockYouTubeService.getActiveLiveChatId).not.toHaveBeenCalled();
            expect(mockYouTubeService.sendChatMessage).not.toHaveBeenCalled();

            // Should return error result
            expect(result.success).toBe(false);
            expect(result.results).toHaveLength(1);
            expect(result.results[0]).toEqual({
                platform: 'youtube',
                success: false,
                error: 'Token inválido',
                errorCode: 'INVALID_TOKEN'
            });
        });
    });

    describe('Successful send', () => {
        it('should successfully send message when all conditions are met', async () => {
            // Mock successful flow
            const mockConnection = {
                userId: 'user123',
                provider: 'youtube',
                providerId: 'channel123',
                providerUsername: 'testchannel',
                save: jest.fn().mockResolvedValue(true)
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
            mockYouTubeService.getActiveLiveChatId.mockResolvedValue('livechat123');
            mockYouTubeService.sendChatMessage.mockResolvedValue('mock-msg-id');

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['youtube']
            });

            // Should call all necessary methods
            expect(Connection.findOne).toHaveBeenCalledWith({
                where: { userId: 'user123', provider: 'youtube' }
            });
            expect(mockConnectionService.getValidAccessToken).toHaveBeenCalledWith('user123', 'youtube');
            expect(mockYouTubeService.getActiveLiveChatId).toHaveBeenCalledWith('valid_token');
            expect(mockYouTubeService.sendChatMessage).toHaveBeenCalledWith(
                'valid_token',
                'livechat123',
                'Test message'
            );

            // Should return success
            expect(result.success).toBe(true);
            expect(result.results).toHaveLength(1);
            expect(result.results[0]).toEqual({
                platform: 'youtube',
                success: true
            });
        });

        it('should successfully send message with valid liveChatId', async () => {
            // Mock successful flow with specific liveChatId
            const mockConnection = {
                userId: 'user123',
                provider: 'youtube',
                providerId: 'channel123',
                providerUsername: 'testchannel',
                save: jest.fn().mockResolvedValue(true)
            };

            const liveChatId = 'Cg0KCzEyMzQ1Njc4OTAw';

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
            mockYouTubeService.getActiveLiveChatId.mockResolvedValue(liveChatId);
            mockYouTubeService.sendChatMessage.mockResolvedValue('mock-msg-id');

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Hello from YouTube!',
                platforms: ['youtube']
            });

            // Should use the correct liveChatId
            expect(mockYouTubeService.sendChatMessage).toHaveBeenCalledWith(
                'valid_token',
                liveChatId,
                'Hello from YouTube!'
            );

            // Should return success
            expect(result.success).toBe(true);
            expect(result.results[0].success).toBe(true);
        });
    });
});
