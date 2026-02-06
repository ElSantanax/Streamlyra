import { MessageSenderService } from '../MessageSenderService';
import { ConnectionService } from '../../connection/ConnectionService';
import { TwitchService } from '../../platforms/TwitchService';
import { YouTubeService } from '../../platforms/YouTubeService';
import { KickService } from '../../platforms/KickService';
import { Connection } from '../../../models/Connection.model';
import { sentMessageCache } from '../../../utils/SentMessageCache';

/**
 * Unit Tests for MessageSenderService - Twitch Edge Cases
 * Feature: multi-platform-message-sending
 * 
 * Tests edge cases for Twitch integration:
 * - Connection not found
 * - Invalid token
 * - API errors
 * 
 * Validates: Requirements 5.5
 */

// Mock Connection model
jest.mock('../../../models/Connection.model');

describe('MessageSenderService - Twitch Edge Cases', () => {
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

        mockTwitchService = {
            sendChatMessage: jest.fn()
        } as unknown as jest.Mocked<TwitchService>;

        mockYouTubeService = {} as unknown as jest.Mocked<YouTubeService>;
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

    describe('Connection not found', () => {
        it('should return NOT_CONNECTED error when Twitch connection does not exist', async () => {
            // Mock no connection found
            (Connection.findOne as jest.Mock).mockResolvedValue(null);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['twitch']
            });

            // Should not attempt to get token or send message
            expect(mockConnectionService.getValidAccessToken).not.toHaveBeenCalled();
            expect(mockTwitchService.sendChatMessage).not.toHaveBeenCalled();

            // Should return error result
            expect(result.success).toBe(false);
            expect(result.results).toHaveLength(1);
            expect(result.results[0]).toEqual({
                platform: 'twitch',
                success: false,
                error: 'No conectado',
                errorCode: 'NOT_CONNECTED'
            });
        });

        it('should continue with other platforms when Twitch connection not found', async () => {
            // Mock no Twitch connection
            (Connection.findOne as jest.Mock).mockResolvedValue(null);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['twitch', 'youtube', 'kick']
            });

            // All platforms should have results
            expect(result.results).toHaveLength(3);

            // Twitch should be marked as not connected
            const twitchResult = result.results.find(r => r.platform === 'twitch');
            expect(twitchResult?.success).toBe(false);
            expect(twitchResult?.errorCode).toBe('NOT_CONNECTED');

            // Other platforms should also have results (even if failed)
            expect(result.results.find(r => r.platform === 'youtube')).toBeDefined();
            expect(result.results.find(r => r.platform === 'kick')).toBeDefined();
        });
    });

    describe('Invalid token', () => {
        it('should return INVALID_TOKEN error when token cannot be obtained', async () => {
            // Mock connection exists but token is invalid
            const mockConnection = {
                userId: 'user123',
                provider: 'twitch',
                providerId: '12345',
                providerUsername: 'testuser'
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue(null);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['twitch']
            });

            // Should attempt to get token but not send message
            expect(mockConnectionService.getValidAccessToken).toHaveBeenCalledWith('user123', 'twitch');
            expect(mockTwitchService.sendChatMessage).not.toHaveBeenCalled();

            // Should return error result
            expect(result.success).toBe(false);
            expect(result.results).toHaveLength(1);
            expect(result.results[0]).toEqual({
                platform: 'twitch',
                success: false,
                error: 'Token inválido',
                errorCode: 'INVALID_TOKEN'
            });
        });

        it('should continue with other platforms when Twitch token is invalid', async () => {
            // Mock connection exists but token is invalid
            const mockConnection = {
                userId: 'user123',
                provider: 'twitch',
                providerId: '12345',
                providerUsername: 'testuser'
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue(null);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['twitch', 'youtube']
            });

            // All platforms should have results
            expect(result.results).toHaveLength(2);

            // Twitch should be marked as invalid token
            const twitchResult = result.results.find(r => r.platform === 'twitch');
            expect(twitchResult?.success).toBe(false);
            expect(twitchResult?.errorCode).toBe('INVALID_TOKEN');

            // YouTube should also have a result
            expect(result.results.find(r => r.platform === 'youtube')).toBeDefined();
        });
    });

    describe('API errors', () => {
        it('should return error when Twitch API throws an error', async () => {
            // Mock successful connection and token
            const mockConnection = {
                userId: 'user123',
                provider: 'twitch',
                providerId: '12345',
                providerUsername: 'testuser'
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');

            // Mock API error
            const apiError = new Error('Rate limit exceeded');
            mockTwitchService.sendChatMessage.mockRejectedValue(apiError);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['twitch']
            });

            // Should attempt to send message
            expect(mockTwitchService.sendChatMessage).toHaveBeenCalledWith(
                'valid_token',
                '12345',
                '12345',
                'Test message'
            );

            // Should return error result with error message
            expect(result.success).toBe(false);
            expect(result.results).toHaveLength(1);
            expect(result.results[0].platform).toBe('twitch');
            expect(result.results[0].success).toBe(false);
            expect(result.results[0].error).toBe('Rate limit exceeded');
            expect(result.results[0].errorCode).toBeDefined();
        });

        it('should continue with other platforms when Twitch API fails', async () => {
            // Mock successful connection and token for Twitch
            const mockConnection = {
                userId: 'user123',
                provider: 'twitch',
                providerId: '12345',
                providerUsername: 'testuser'
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');

            // Mock Twitch API error
            mockTwitchService.sendChatMessage.mockRejectedValue(new Error('API Error'));

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['twitch', 'youtube', 'kick']
            });

            // All platforms should have results
            expect(result.results).toHaveLength(3);

            // Twitch should be marked as failed
            const twitchResult = result.results.find(r => r.platform === 'twitch');
            expect(twitchResult?.success).toBe(false);
            expect(twitchResult?.error).toBe('API Error');

            // Other platforms should also have results
            expect(result.results.find(r => r.platform === 'youtube')).toBeDefined();
            expect(result.results.find(r => r.platform === 'kick')).toBeDefined();
        });

        it('should handle API errors with error codes', async () => {
            // Mock successful connection and token
            const mockConnection = {
                userId: 'user123',
                provider: 'twitch',
                providerId: '12345',
                providerUsername: 'testuser'
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');

            // Mock API error with code
            const apiError = new Error('Forbidden');
            (apiError as { code?: string }).code = 'FORBIDDEN';
            mockTwitchService.sendChatMessage.mockRejectedValue(apiError);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['twitch']
            });

            // Should return error with code
            expect(result.results[0].error).toBe('Forbidden');
            expect(result.results[0].errorCode).toBe('FORBIDDEN');
        });

        it('should use default error code when API error has no code', async () => {
            // Mock successful connection and token
            const mockConnection = {
                userId: 'user123',
                provider: 'twitch',
                providerId: '12345',
                providerUsername: 'testuser'
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');

            // Mock API error without code
            mockTwitchService.sendChatMessage.mockRejectedValue(new Error('Unknown error'));

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['twitch']
            });

            // Should use default error code
            expect(result.results[0].error).toBe('Unknown error');
            expect(result.results[0].errorCode).toBe('TWITCH_ERROR');
        });
    });

    describe('Successful send', () => {
        it('should successfully send message when all conditions are met', async () => {
            // Mock successful flow
            const mockConnection = {
                userId: 'user123',
                provider: 'twitch',
                providerId: '12345',
                providerUsername: 'testuser'
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
            mockTwitchService.sendChatMessage.mockResolvedValue('mock-msg-id');

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['twitch']
            });

            // Should call all necessary methods
            expect(Connection.findOne).toHaveBeenCalledWith({
                where: { userId: 'user123', provider: 'twitch' }
            });
            expect(mockConnectionService.getValidAccessToken).toHaveBeenCalledWith('user123', 'twitch');
            expect(mockTwitchService.sendChatMessage).toHaveBeenCalledWith(
                'valid_token',
                '12345',
                '12345',
                'Test message'
            );

            // Should return success
            expect(result.success).toBe(true);
            expect(result.results).toHaveLength(1);
            expect(result.results[0]).toEqual({
                platform: 'twitch',
                success: true
            });
        });
    });
});
