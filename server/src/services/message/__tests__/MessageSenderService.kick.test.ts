import { MessageSenderService } from '../MessageSenderService';
import { ConnectionService } from '../../connection/ConnectionService';
import { TwitchService } from '../../platforms/TwitchService';
import { YouTubeService } from '../../platforms/YouTubeService';
import { KickService } from '../../platforms/KickService';
import { Connection } from '../../../models/Connection.model';
import { sentMessageCache } from '../../../utils/SentMessageCache';

/**
 * Unit Tests for MessageSenderService - Kick Edge Cases
 * Feature: multi-platform-message-sending
 * 
 * Tests edge cases for Kick integration:
 * - Connection not found
 * - API errors
 * 
 * Validates: Requirements 7.5
 */

// Mock Connection model
jest.mock('../../../models/Connection.model');

describe('MessageSenderService - Kick Edge Cases', () => {
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
        mockYouTubeService = {} as unknown as jest.Mocked<YouTubeService>;
        
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

    describe('Connection not found', () => {
        it('should return NOT_CONNECTED error when Kick connection does not exist', async () => {
            // Mock no connection found
            (Connection.findOne as jest.Mock).mockResolvedValue(null);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['kick']
            });

            // Should not attempt to get token or send message
            expect(mockConnectionService.getValidAccessToken).not.toHaveBeenCalled();
            expect(mockKickService.sendChatMessage).not.toHaveBeenCalled();

            // Should return error result
            expect(result.success).toBe(false);
            expect(result.results).toHaveLength(1);
            expect(result.results[0]).toEqual({
                platform: 'kick',
                success: false,
                error: 'No conectado',
                errorCode: 'NOT_CONNECTED'
            });
        });

        it('should continue with other platforms when Kick connection not found', async () => {
            // Mock no Kick connection
            (Connection.findOne as jest.Mock).mockResolvedValue(null);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['kick', 'twitch', 'youtube']
            });

            // All platforms should have results
            expect(result.results).toHaveLength(3);

            // Kick should be marked as not connected
            const kickResult = result.results.find(r => r.platform === 'kick');
            expect(kickResult?.success).toBe(false);
            expect(kickResult?.errorCode).toBe('NOT_CONNECTED');

            // Other platforms should also have results (even if failed)
            expect(result.results.find(r => r.platform === 'twitch')).toBeDefined();
            expect(result.results.find(r => r.platform === 'youtube')).toBeDefined();
        });
    });

    describe('Invalid token', () => {
        it('should return INVALID_TOKEN error when token cannot be obtained', async () => {
            // Mock connection exists but token is invalid
            const mockConnection = {
                userId: 'user123',
                provider: 'kick',
                providerId: '12345',
                providerUsername: 'testuser'
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue(null);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['kick']
            });

            // Should attempt to get token but not send message
            expect(mockConnectionService.getValidAccessToken).toHaveBeenCalledWith('user123', 'kick');
            expect(mockKickService.sendChatMessage).not.toHaveBeenCalled();

            // Should return error result
            expect(result.success).toBe(false);
            expect(result.results).toHaveLength(1);
            expect(result.results[0]).toEqual({
                platform: 'kick',
                success: false,
                error: 'Token inválido',
                errorCode: 'INVALID_TOKEN'
            });
        });

        it('should continue with other platforms when Kick token is invalid', async () => {
            // Mock connection exists but token is invalid
            const mockConnection = {
                userId: 'user123',
                provider: 'kick',
                providerId: '12345',
                providerUsername: 'testuser'
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue(null);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['kick', 'twitch']
            });

            // All platforms should have results
            expect(result.results).toHaveLength(2);

            // Kick should be marked as invalid token
            const kickResult = result.results.find(r => r.platform === 'kick');
            expect(kickResult?.success).toBe(false);
            expect(kickResult?.errorCode).toBe('INVALID_TOKEN');

            // Twitch should also have a result
            expect(result.results.find(r => r.platform === 'twitch')).toBeDefined();
        });
    });

    describe('API errors', () => {
        it('should return error when Kick API throws an error', async () => {
            // Mock successful connection and token
            const mockConnection = {
                userId: 'user123',
                provider: 'kick',
                providerId: '12345',
                providerUsername: 'testuser'
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');

            // Mock API error
            const apiError = new Error('Rate limit exceeded');
            mockKickService.sendChatMessage.mockRejectedValue(apiError);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['kick']
            });

            // Should attempt to send message
            expect(mockKickService.sendChatMessage).toHaveBeenCalledWith(
                'valid_token',
                '12345',
                'Test message'
            );

            // Should return error result with error message
            expect(result.success).toBe(false);
            expect(result.results).toHaveLength(1);
            expect(result.results[0].platform).toBe('kick');
            expect(result.results[0].success).toBe(false);
            expect(result.results[0].error).toBe('Rate limit exceeded');
            expect(result.results[0].errorCode).toBeDefined();
        });

        it('should continue with other platforms when Kick API fails', async () => {
            // Mock successful connection and token for Kick
            const mockConnection = {
                userId: 'user123',
                provider: 'kick',
                providerId: '12345',
                providerUsername: 'testuser'
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');

            // Mock Kick API error
            mockKickService.sendChatMessage.mockRejectedValue(new Error('API Error'));

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['kick', 'twitch', 'youtube']
            });

            // All platforms should have results
            expect(result.results).toHaveLength(3);

            // Kick should be marked as failed
            const kickResult = result.results.find(r => r.platform === 'kick');
            expect(kickResult?.success).toBe(false);
            expect(kickResult?.error).toBe('API Error');

            // Other platforms should also have results
            expect(result.results.find(r => r.platform === 'twitch')).toBeDefined();
            expect(result.results.find(r => r.platform === 'youtube')).toBeDefined();
        });

        it('should handle API errors with error codes', async () => {
            // Mock successful connection and token
            const mockConnection = {
                userId: 'user123',
                provider: 'kick',
                providerId: '12345',
                providerUsername: 'testuser'
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');

            // Mock API error with code
            const apiError = new Error('Forbidden');
            (apiError as { code?: string }).code = 'FORBIDDEN';
            mockKickService.sendChatMessage.mockRejectedValue(apiError);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['kick']
            });

            // Should return error with code
            expect(result.results[0].error).toBe('Forbidden');
            expect(result.results[0].errorCode).toBe('FORBIDDEN');
        });

        it('should use default error code when API error has no code', async () => {
            // Mock successful connection and token
            const mockConnection = {
                userId: 'user123',
                provider: 'kick',
                providerId: '12345',
                providerUsername: 'testuser'
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');

            // Mock API error without code
            mockKickService.sendChatMessage.mockRejectedValue(new Error('Unknown error'));

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['kick']
            });

            // Should use default error code
            expect(result.results[0].error).toBe('Unknown error');
            expect(result.results[0].errorCode).toBe('KICK_ERROR');
        });
    });

    describe('Successful send', () => {
        it('should successfully send message when all conditions are met', async () => {
            // Mock successful flow
            const mockConnection = {
                userId: 'user123',
                provider: 'kick',
                providerId: '12345',
                providerUsername: 'testuser'
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
            mockKickService.sendChatMessage.mockResolvedValue(undefined);

            const result = await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['kick']
            });

            // Should call all necessary methods
            expect(Connection.findOne).toHaveBeenCalledWith({
                where: { userId: 'user123', provider: 'kick' }
            });
            expect(mockConnectionService.getValidAccessToken).toHaveBeenCalledWith('user123', 'kick');
            expect(mockKickService.sendChatMessage).toHaveBeenCalledWith(
                'valid_token',
                '12345',
                'Test message'
            );

            // Should return success
            expect(result.success).toBe(true);
            expect(result.results).toHaveLength(1);
            expect(result.results[0]).toEqual({
                platform: 'kick',
                success: true
            });
        });

        it('should use channelId from connection providerId', async () => {
            // Mock successful flow with specific channelId
            const mockConnection = {
                userId: 'user123',
                provider: 'kick',
                providerId: 'channel_abc_123',
                providerUsername: 'testuser'
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
            mockKickService.sendChatMessage.mockResolvedValue(undefined);

            await messageSenderService.sendMessage({
                userId: 'user123',
                message: 'Test message',
                platforms: ['kick']
            });

            // Should use providerId as channelId
            expect(mockKickService.sendChatMessage).toHaveBeenCalledWith(
                'valid_token',
                'channel_abc_123',
                'Test message'
            );
        });
    });
});
