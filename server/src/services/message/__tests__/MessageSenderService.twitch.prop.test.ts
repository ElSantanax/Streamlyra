import fc from 'fast-check';
import { MessageSenderService } from '../MessageSenderService';
import { ConnectionService } from '../../connection/ConnectionService';
import { TwitchService } from '../../platforms/TwitchService';
import { YouTubeService } from '../../platforms/YouTubeService';
import { KickService } from '../../platforms/KickService';
import { Connection } from '../../../models/Connection.model';

/**
 * Property-Based Tests for MessageSenderService - Twitch Integration
 * Feature: multi-platform-message-sending
 * 
 * Property 14: Platform-specific API calls include required fields
 * Property 15: Successful API responses are recorded
 * Property 16: API errors don't stop other platforms
 * 
 * Validates: Requirements 5.2, 5.3, 5.4
 */

// Mock Connection model
jest.mock('../../../models/Connection.model');

describe('Feature: multi-platform-message-sending, Property 14: Platform-specific API calls include required fields', () => {
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

    it('should include all required fields when calling Twitch API', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(), // userId
                fc.string({ minLength: 1, maxLength: 500 }), // message
                fc.string({ minLength: 1, maxLength: 20 }), // providerId
                fc.string({ minLength: 10, maxLength: 50 }), // accessToken
                async (userId, message, providerId, accessToken) => {
                    // Reset mocks for each property test iteration
                    jest.clearAllMocks();

                    // Mock connection exists
                    const mockConnection = {
                        userId,
                        provider: 'twitch',
                        providerId,
                        providerUsername: 'testuser',
                        accessToken: 'old_token',
                        refreshToken: 'refresh_token'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue(accessToken);
                    mockTwitchService.sendChatMessage.mockResolvedValue('mock-msg-id');

                    // Send message
                    await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['twitch']
                    });

                    // Property: TwitchService.sendChatMessage should be called with all required fields
                    expect(mockTwitchService.sendChatMessage).toHaveBeenCalledTimes(1);
                    expect(mockTwitchService.sendChatMessage).toHaveBeenCalledWith(
                        accessToken,      // Required: access token
                        providerId,       // Required: broadcaster_id
                        providerId,       // Required: sender_id
                        message          // Required: message
                    );

                    // Property: All arguments should be non-empty strings
                    const callArgs = mockTwitchService.sendChatMessage.mock.calls[0];
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
                        provider: 'twitch',
                        providerId: '12345',
                        providerUsername: 'testuser'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue(accessToken);
                    mockTwitchService.sendChatMessage.mockResolvedValue('mock-msg-id');

                    await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['twitch']
                    });

                    // Property: ConnectionService should be called to get valid token
                    expect(mockConnectionService.getValidAccessToken).toHaveBeenCalledWith(
                        userId,
                        'twitch'
                    );

                    // Property: The token from ConnectionService should be used in API call
                    expect(mockTwitchService.sendChatMessage).toHaveBeenCalledWith(
                        accessToken,
                        expect.any(String),
                        expect.any(String),
                        expect.any(String)
                    );
                }
            ),
            { numRuns: 100 }
        );
    });
});

describe('Feature: multi-platform-message-sending, Property 15: Successful API responses are recorded', () => {
    let messageSenderService: MessageSenderService;
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let mockTwitchService: jest.Mocked<TwitchService>;
    let mockYouTubeService: jest.Mocked<YouTubeService>;
    let mockKickService: jest.Mocked<KickService>;

    beforeEach(() => {
        jest.clearAllMocks();

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

    it('should record success when Twitch API call succeeds', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                async (userId, message) => {
                    // Mock successful flow
                    const mockConnection = {
                        userId,
                        provider: 'twitch',
                        providerId: '12345',
                        providerUsername: 'testuser'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
                    mockTwitchService.sendChatMessage.mockResolvedValue('mock-msg-id');

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['twitch']
                    });

                    // Property: Result should contain Twitch platform result
                    const twitchResult = result.results.find(r => r.platform === 'twitch');
                    expect(twitchResult).toBeDefined();

                    // Property: Success should be true
                    expect(twitchResult?.success).toBe(true);

                    // Property: No error fields should be present on success
                    expect(twitchResult?.error).toBeUndefined();
                    expect(twitchResult?.errorCode).toBeUndefined();

                    // Property: Overall success should be true
                    expect(result.success).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should record success for Twitch even when other platforms fail', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                async (userId, message) => {
                    // Mock Twitch success
                    const mockConnection = {
                        userId,
                        provider: 'twitch',
                        providerId: '12345',
                        providerUsername: 'testuser'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
                    mockTwitchService.sendChatMessage.mockResolvedValue('mock-msg-id');

                    // Request multiple platforms (Twitch will succeed, others will fail)
                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['twitch', 'youtube', 'kick']
                    });

                    // Property: Twitch result should be successful
                    const twitchResult = result.results.find(r => r.platform === 'twitch');
                    expect(twitchResult?.success).toBe(true);

                    // Property: Overall success should be true (at least one succeeded)
                    expect(result.success).toBe(true);

                    // Property: All platforms should have results
                    expect(result.results.length).toBe(3);
                }
            ),
            { numRuns: 100 }
        );
    });
});

describe('Feature: multi-platform-message-sending, Property 16: API errors don\'t stop other platforms', () => {
    let messageSenderService: MessageSenderService;
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let mockTwitchService: jest.Mocked<TwitchService>;
    let mockYouTubeService: jest.Mocked<YouTubeService>;
    let mockKickService: jest.Mocked<KickService>;

    beforeEach(() => {
        jest.clearAllMocks();

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

    it('should record error when Twitch API call fails', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.string({ minLength: 5, maxLength: 50 }), // error message
                async (userId, message, errorMessage) => {
                    // Mock connection exists but API call fails
                    const mockConnection = {
                        userId,
                        provider: 'twitch',
                        providerId: '12345',
                        providerUsername: 'testuser'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
                    mockTwitchService.sendChatMessage.mockRejectedValue(new Error(errorMessage));

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['twitch']
                    });

                    // Property: Result should contain Twitch platform result
                    const twitchResult = result.results.find(r => r.platform === 'twitch');
                    expect(twitchResult).toBeDefined();

                    // Property: Success should be false
                    expect(twitchResult?.success).toBe(false);

                    // Property: Error message should be present
                    expect(twitchResult?.error).toBeDefined();
                    expect(typeof twitchResult?.error).toBe('string');

                    // Property: Error code should be present
                    expect(twitchResult?.errorCode).toBeDefined();
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should continue processing other platforms when Twitch fails', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                async (userId, message) => {
                    // Mock Twitch failure
                    const mockConnection = {
                        userId,
                        provider: 'twitch',
                        providerId: '12345',
                        providerUsername: 'testuser'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
                    mockTwitchService.sendChatMessage.mockRejectedValue(new Error('API Error'));

                    // Request multiple platforms
                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['twitch', 'youtube', 'kick']
                    });

                    // Property: All platforms should have results despite Twitch failure
                    expect(result.results.length).toBe(3);

                    // Property: Twitch should be marked as failed
                    const twitchResult = result.results.find(r => r.platform === 'twitch');
                    expect(twitchResult?.success).toBe(false);

                    // Property: Other platforms should have results (even if also failed)
                    const youtubeResult = result.results.find(r => r.platform === 'youtube');
                    const kickResult = result.results.find(r => r.platform === 'kick');
                    expect(youtubeResult).toBeDefined();
                    expect(kickResult).toBeDefined();
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should handle connection not found without stopping other platforms', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                async (userId, message) => {
                    // Mock no connection for Twitch
                    (Connection.findOne as jest.Mock).mockResolvedValue(null);

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['twitch', 'youtube']
                    });

                    // Property: Twitch should be marked as not connected
                    const twitchResult = result.results.find(r => r.platform === 'twitch');
                    expect(twitchResult?.success).toBe(false);
                    expect(twitchResult?.errorCode).toBe('NOT_CONNECTED');

                    // Property: Other platforms should still be processed
                    expect(result.results.length).toBe(2);
                    const youtubeResult = result.results.find(r => r.platform === 'youtube');
                    expect(youtubeResult).toBeDefined();
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should handle invalid token without stopping other platforms', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                async (userId, message) => {
                    // Mock connection exists but token is invalid
                    const mockConnection = {
                        userId,
                        provider: 'twitch',
                        providerId: '12345',
                        providerUsername: 'testuser'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue(null);

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['twitch', 'kick']
                    });

                    // Property: Twitch should be marked as invalid token
                    const twitchResult = result.results.find(r => r.platform === 'twitch');
                    expect(twitchResult?.success).toBe(false);
                    expect(twitchResult?.errorCode).toBe('INVALID_TOKEN');

                    // Property: Other platforms should still be processed
                    expect(result.results.length).toBe(2);
                    const kickResult = result.results.find(r => r.platform === 'kick');
                    expect(kickResult).toBeDefined();
                }
            ),
            { numRuns: 100 }
        );
    });
});
