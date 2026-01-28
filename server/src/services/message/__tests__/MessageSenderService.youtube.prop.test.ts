import fc from 'fast-check';
import { MessageSenderService } from '../MessageSenderService';
import { ConnectionService } from '../../connection/ConnectionService';
import { TwitchService } from '../../platforms/TwitchService';
import { YouTubeService } from '../../platforms/YouTubeService';
import { KickService } from '../../platforms/KickService';
import { Connection } from '../../../models/Connection.model';

/**
 * Property-Based Tests for MessageSenderService - YouTube Integration
 * Feature: multi-platform-message-sending
 * 
 * Property 14: Platform-specific API calls include required fields
 * Property 17: Disconnected platforms are skipped
 * 
 * Validates: Requirements 6.2, 6.5
 */

// Mock Connection model
jest.mock('../../../models/Connection.model');

describe('Feature: multi-platform-message-sending, Property 14: Platform-specific API calls include required fields (YouTube)', () => {
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

    it('should include all required fields when calling YouTube API', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(), // userId
                fc.string({ minLength: 1, maxLength: 500 }), // message
                fc.string({ minLength: 1, maxLength: 30 }), // providerId (channel ID)
                fc.string({ minLength: 10, maxLength: 50 }), // accessToken
                fc.string({ minLength: 10, maxLength: 50 }), // liveChatId
                async (userId, message, providerId, accessToken, liveChatId) => {
                    // Reset mocks for each property test iteration
                    jest.clearAllMocks();

                    // Mock connection exists
                    const mockConnection = {
                        userId,
                        provider: 'youtube',
                        providerId,
                        providerUsername: 'testchannel',
                        accessToken: 'old_token',
                        refreshToken: 'refresh_token'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue(accessToken);
                    mockYouTubeService.getActiveLiveChatId.mockResolvedValue(liveChatId);
                    mockYouTubeService.sendChatMessage.mockResolvedValue(undefined);

                    // Send message
                    await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['youtube']
                    });

                    // Property: YouTubeService.getActiveLiveChatId should be called with access token
                    expect(mockYouTubeService.getActiveLiveChatId).toHaveBeenCalledTimes(1);
                    expect(mockYouTubeService.getActiveLiveChatId).toHaveBeenCalledWith(accessToken);

                    // Property: YouTubeService.sendChatMessage should be called with all required fields
                    expect(mockYouTubeService.sendChatMessage).toHaveBeenCalledTimes(1);
                    expect(mockYouTubeService.sendChatMessage).toHaveBeenCalledWith(
                        accessToken,  // Required: access token
                        liveChatId,   // Required: liveChatId
                        message       // Required: message
                    );

                    // Property: All arguments should be non-empty strings
                    const callArgs = mockYouTubeService.sendChatMessage.mock.calls[0];
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
                fc.string({ minLength: 10, maxLength: 50 }),
                async (userId, message, accessToken, liveChatId) => {
                    const mockConnection = {
                        userId,
                        provider: 'youtube',
                        providerId: 'channel123',
                        providerUsername: 'testchannel'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue(accessToken);
                    mockYouTubeService.getActiveLiveChatId.mockResolvedValue(liveChatId);
                    mockYouTubeService.sendChatMessage.mockResolvedValue(undefined);

                    await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['youtube']
                    });

                    // Property: ConnectionService should be called to get valid token
                    expect(mockConnectionService.getValidAccessToken).toHaveBeenCalledWith(
                        userId,
                        'youtube'
                    );

                    // Property: The token from ConnectionService should be used in API calls
                    expect(mockYouTubeService.getActiveLiveChatId).toHaveBeenCalledWith(accessToken);
                    expect(mockYouTubeService.sendChatMessage).toHaveBeenCalledWith(
                        accessToken,
                        expect.any(String),
                        expect.any(String)
                    );
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should retrieve liveChatId before sending message', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.string({ minLength: 10, maxLength: 50 }),
                async (userId, message, liveChatId) => {
                    const mockConnection = {
                        userId,
                        provider: 'youtube',
                        providerId: 'channel123',
                        providerUsername: 'testchannel'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
                    mockYouTubeService.getActiveLiveChatId.mockResolvedValue(liveChatId);
                    mockYouTubeService.sendChatMessage.mockResolvedValue(undefined);

                    await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['youtube']
                    });

                    // Property: getActiveLiveChatId must be called before sendChatMessage
                    const getActiveLiveChatIdOrder = mockYouTubeService.getActiveLiveChatId.mock.invocationCallOrder[0];
                    const sendChatMessageOrder = mockYouTubeService.sendChatMessage.mock.invocationCallOrder[0];
                    expect(getActiveLiveChatIdOrder).toBeLessThan(sendChatMessageOrder);

                    // Property: The liveChatId from getActiveLiveChatId should be used in sendChatMessage
                    expect(mockYouTubeService.sendChatMessage).toHaveBeenCalledWith(
                        expect.any(String),
                        liveChatId,
                        expect.any(String)
                    );
                }
            ),
            { numRuns: 100 }
        );
    });
});

describe('Feature: multi-platform-message-sending, Property 17: Disconnected platforms are skipped (YouTube)', () => {
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

    it('should skip YouTube when connection does not exist', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                async (userId, message) => {
                    // Mock no connection for YouTube
                    (Connection.findOne as jest.Mock).mockResolvedValue(null);

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['youtube']
                    });

                    // Property: YouTube should be marked as not connected
                    const youtubeResult = result.results.find(r => r.platform === 'youtube');
                    expect(youtubeResult).toBeDefined();
                    expect(youtubeResult?.success).toBe(false);
                    expect(youtubeResult?.errorCode).toBe('NOT_CONNECTED');

                    // Property: YouTube API methods should not be called
                    expect(mockYouTubeService.getActiveLiveChatId).not.toHaveBeenCalled();
                    expect(mockYouTubeService.sendChatMessage).not.toHaveBeenCalled();
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should skip YouTube when access token is invalid', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                async (userId, message) => {
                    // Mock connection exists but token is invalid
                    const mockConnection = {
                        userId,
                        provider: 'youtube',
                        providerId: 'channel123',
                        providerUsername: 'testchannel'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue(null);

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['youtube']
                    });

                    // Property: YouTube should be marked as invalid token
                    const youtubeResult = result.results.find(r => r.platform === 'youtube');
                    expect(youtubeResult?.success).toBe(false);
                    expect(youtubeResult?.errorCode).toBe('INVALID_TOKEN');

                    // Property: YouTube API methods should not be called
                    expect(mockYouTubeService.getActiveLiveChatId).not.toHaveBeenCalled();
                    expect(mockYouTubeService.sendChatMessage).not.toHaveBeenCalled();
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should skip YouTube when no live broadcast is active', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                async (userId, message) => {
                    // Mock connection exists and token is valid, but no live broadcast
                    const mockConnection = {
                        userId,
                        provider: 'youtube',
                        providerId: 'channel123',
                        providerUsername: 'testchannel'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
                    mockYouTubeService.getActiveLiveChatId.mockResolvedValue(null); // No live broadcast

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['youtube']
                    });

                    // Property: YouTube should be marked as no live broadcast
                    const youtubeResult = result.results.find(r => r.platform === 'youtube');
                    expect(youtubeResult?.success).toBe(false);
                    expect(youtubeResult?.errorCode).toBe('NO_LIVE_BROADCAST');

                    // Property: getActiveLiveChatId should be called
                    expect(mockYouTubeService.getActiveLiveChatId).toHaveBeenCalled();

                    // Property: sendChatMessage should NOT be called
                    expect(mockYouTubeService.sendChatMessage).not.toHaveBeenCalled();
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should not stop other platforms when YouTube is disconnected', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                async (userId, message) => {
                    // Mock no connection for YouTube
                    (Connection.findOne as jest.Mock).mockResolvedValue(null);

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['youtube', 'twitch', 'kick']
                    });

                    // Property: All platforms should have results
                    expect(result.results.length).toBe(3);

                    // Property: YouTube should be marked as not connected
                    const youtubeResult = result.results.find(r => r.platform === 'youtube');
                    expect(youtubeResult?.success).toBe(false);
                    expect(youtubeResult?.errorCode).toBe('NOT_CONNECTED');

                    // Property: Other platforms should have results (even if also failed)
                    const twitchResult = result.results.find(r => r.platform === 'twitch');
                    const kickResult = result.results.find(r => r.platform === 'kick');
                    expect(twitchResult).toBeDefined();
                    expect(kickResult).toBeDefined();
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should record success when YouTube connection exists and broadcast is live', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.string({ minLength: 10, maxLength: 50 }),
                async (userId, message, liveChatId) => {
                    // Mock successful flow
                    const mockConnection = {
                        userId,
                        provider: 'youtube',
                        providerId: 'channel123',
                        providerUsername: 'testchannel'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
                    mockYouTubeService.getActiveLiveChatId.mockResolvedValue(liveChatId);
                    mockYouTubeService.sendChatMessage.mockResolvedValue(undefined);

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['youtube']
                    });

                    // Property: Result should contain YouTube platform result
                    const youtubeResult = result.results.find(r => r.platform === 'youtube');
                    expect(youtubeResult).toBeDefined();

                    // Property: Success should be true
                    expect(youtubeResult?.success).toBe(true);

                    // Property: No error fields should be present on success
                    expect(youtubeResult?.error).toBeUndefined();
                    expect(youtubeResult?.errorCode).toBeUndefined();

                    // Property: Overall success should be true
                    expect(result.success).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });
});
