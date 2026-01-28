import fc from 'fast-check';
import { MessageSenderService } from '../MessageSenderService';
import { ConnectionService } from '../../connection/ConnectionService';
import { TwitchService } from '../../platforms/TwitchService';
import { YouTubeService } from '../../platforms/YouTubeService';
import { KickService } from '../../platforms/KickService';
import { Connection } from '../../../models/Connection.model';

/**
 * Property-Based Tests for MessageSenderService - Kick Integration
 * Feature: multi-platform-message-sending
 * 
 * Property 14: Platform-specific API calls include required fields
 * 
 * Validates: Requirements 7.2
 */

// Mock Connection model
jest.mock('../../../models/Connection.model');

describe('Feature: multi-platform-message-sending, Property 14: Platform-specific API calls include required fields (Kick)', () => {
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

    it('should include all required fields when calling Kick API', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(), // userId
                fc.string({ minLength: 1, maxLength: 500 }), // message
                fc.string({ minLength: 1, maxLength: 20 }), // channelId
                fc.string({ minLength: 10, maxLength: 50 }), // accessToken
                async (userId, message, channelId, accessToken) => {
                    // Reset mocks for each property test iteration
                    jest.clearAllMocks();

                    // Mock connection exists
                    const mockConnection = {
                        userId,
                        provider: 'kick',
                        providerId: channelId,
                        providerUsername: 'testuser',
                        accessToken: 'old_token',
                        refreshToken: 'refresh_token'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue(accessToken);
                    mockKickService.sendChatMessage.mockResolvedValue(undefined);

                    // Send message
                    await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['kick']
                    });

                    // Property: KickService.sendChatMessage should be called with all required fields
                    expect(mockKickService.sendChatMessage).toHaveBeenCalledTimes(1);
                    expect(mockKickService.sendChatMessage).toHaveBeenCalledWith(
                        accessToken,      // Required: access token
                        channelId,        // Required: channel ID
                        message          // Required: message
                    );

                    // Property: All arguments should be non-empty strings
                    const callArgs = mockKickService.sendChatMessage.mock.calls[0];
                    callArgs.forEach(arg => {
                        expect(typeof arg).toBe('string');
                        expect(arg.length).toBeGreaterThan(0);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should use valid access token from ConnectionService', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.string({ minLength: 10, maxLength: 50 }),
                async (userId, message, accessToken) => {
                    const mockConnection = {
                        userId,
                        provider: 'kick',
                        providerId: '12345',
                        providerUsername: 'testuser'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue(accessToken);
                    mockKickService.sendChatMessage.mockResolvedValue(undefined);

                    await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['kick']
                    });

                    // Property: ConnectionService should be called to get valid token
                    expect(mockConnectionService.getValidAccessToken).toHaveBeenCalledWith(
                        userId,
                        'kick'
                    );

                    // Property: The token from ConnectionService should be used in API call
                    expect(mockKickService.sendChatMessage).toHaveBeenCalledWith(
                        accessToken,
                        expect.any(String),
                        expect.any(String)
                    );
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should use channelId from connection providerId', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.string({ minLength: 1, maxLength: 20 }),
                async (userId, message, channelId) => {
                    const mockConnection = {
                        userId,
                        provider: 'kick',
                        providerId: channelId,
                        providerUsername: 'testuser'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
                    mockKickService.sendChatMessage.mockResolvedValue(undefined);

                    await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['kick']
                    });

                    // Property: The channelId from connection.providerId should be used
                    expect(mockKickService.sendChatMessage).toHaveBeenCalledWith(
                        expect.any(String),
                        channelId,
                        expect.any(String)
                    );
                }
            ),
            { numRuns: 100 }
        );
    });
});
