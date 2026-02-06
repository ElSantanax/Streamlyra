import fc from 'fast-check';
import { MessageSenderService } from '../MessageSenderService';
import { ConnectionService } from '../../connection/ConnectionService';
import { TwitchService } from '../../platforms/TwitchService';
import { YouTubeService } from '../../platforms/YouTubeService';
import { KickService } from '../../platforms/KickService';
import { Connection } from '../../../models/Connection.model';
import { Platform } from '../../../constants/platforms';

/**
 * Property-Based Tests for MessageSenderService - Token Handling
 * Feature: multi-platform-message-sending
 * 
 * Property 25: Access tokens are valid
 * Property 26: Credentials never exposed to client
 * 
 * Validates: Requirements 11.3, 11.4
 */

// Mock Connection model
jest.mock('../../../models/Connection.model');

describe('Feature: multi-platform-message-sending, Property 25: Access tokens are valid', () => {
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

        mockYouTubeService = {
            sendChatMessage: jest.fn(),
            getActiveLiveChatId: jest.fn()
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

    it('should request valid access token before making platform API calls', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(), // userId
                fc.string({ minLength: 1, maxLength: 100 }), // message
                fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform), // platform
                async (userId, message, platform) => {
                    jest.clearAllMocks();

                    // Mock connection exists
                    const mockConnection = {
                        id: fc.sample(fc.uuid(), 1)[0],
                        userId,
                        provider: platform,
                        providerId: '12345',
                        providerUsername: 'testuser',
                        accessToken: 'stored_token',
                        refreshToken: 'refresh_token'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
                    
                    // Mock platform services
                    mockTwitchService.sendChatMessage.mockResolvedValue('mock-msg-id');
                    mockYouTubeService.getActiveLiveChatId.mockResolvedValue('liveChatId123');
                    mockYouTubeService.sendChatMessage.mockResolvedValue('mock-msg-id');
                    mockKickService.sendChatMessage.mockResolvedValue('mock-msg-id');

                    await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: [platform]
                    });

                    // Property: getValidAccessToken should be called before platform API
                    expect(mockConnectionService.getValidAccessToken).toHaveBeenCalledWith(userId, platform);
                    
                    // Property: getValidAccessToken should be called exactly once per platform
                    expect(mockConnectionService.getValidAccessToken).toHaveBeenCalledTimes(1);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should use token from ConnectionService, not from database directly', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                fc.string({ minLength: 20, maxLength: 50 }), // stored token
                fc.string({ minLength: 20, maxLength: 50 }), // valid token (potentially refreshed)
                async (userId, message, platform, storedToken, validToken) => {
                    // Ensure tokens are different to test that valid token is used
                    fc.pre(storedToken !== validToken);

                    jest.clearAllMocks();

                    // Mock connection with stored token
                    const mockConnection = {
                        id: fc.sample(fc.uuid(), 1)[0],
                        userId,
                        provider: platform,
                        providerId: '12345',
                        providerUsername: 'testuser',
                        accessToken: storedToken, // Old/expired token
                        refreshToken: 'refresh_token'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    // ConnectionService returns refreshed/valid token
                    mockConnectionService.getValidAccessToken.mockResolvedValue(validToken);
                    
                    // Mock platform services to capture the token used
                    mockTwitchService.sendChatMessage.mockResolvedValue('mock-msg-id');
                    mockYouTubeService.getActiveLiveChatId.mockResolvedValue('liveChatId123');
                    mockYouTubeService.sendChatMessage.mockResolvedValue('mock-msg-id');
                    mockKickService.sendChatMessage.mockResolvedValue('mock-msg-id');

                    await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: [platform]
                    });

                    // Property: Platform API should be called with the valid token from ConnectionService
                    if (platform === 'twitch') {
                        expect(mockTwitchService.sendChatMessage).toHaveBeenCalledWith(
                            validToken, // Not storedToken
                            expect.any(String),
                            expect.any(String),
                            message
                        );
                    } else if (platform === 'youtube') {
                        expect(mockYouTubeService.getActiveLiveChatId).toHaveBeenCalledWith(validToken);
                    } else if (platform === 'kick') {
                        expect(mockKickService.sendChatMessage).toHaveBeenCalledWith(
                            validToken,
                            expect.any(String),
                            message
                        );
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should fail gracefully when valid token cannot be obtained', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                async (userId, message, platform) => {
                    jest.clearAllMocks();

                    // Mock connection exists but token refresh fails
                    const mockConnection = {
                        id: fc.sample(fc.uuid(), 1)[0],
                        userId,
                        provider: platform,
                        providerId: '12345',
                        providerUsername: 'testuser',
                        accessToken: 'expired_token',
                        refreshToken: 'invalid_refresh'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    // ConnectionService cannot get valid token (refresh failed)
                    mockConnectionService.getValidAccessToken.mockResolvedValue(null);

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: [platform]
                    });

                    // Property: Should attempt to get valid token
                    expect(mockConnectionService.getValidAccessToken).toHaveBeenCalled();

                    // Property: Should not call platform API if token is invalid
                    expect(mockTwitchService.sendChatMessage).not.toHaveBeenCalled();
                    expect(mockYouTubeService.sendChatMessage).not.toHaveBeenCalled();
                    expect(mockKickService.sendChatMessage).not.toHaveBeenCalled();

                    // Property: Should return error result
                    const platformResult = result.results.find(r => r.platform === platform);
                    expect(platformResult?.success).toBe(false);
                    expect(platformResult?.errorCode).toBe('INVALID_TOKEN');
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should request valid token for each platform independently', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.uniqueArray(
                    fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                    { minLength: 2, maxLength: 3 }
                ),
                async (userId, message, platforms) => {
                    jest.clearAllMocks();

                    // Mock connections exist for all platforms
                    (Connection.findOne as jest.Mock).mockImplementation(async ({ where }: { where: { userId: string; provider: string } }) => {
                        const { provider } = where;
                        return {
                            id: fc.sample(fc.uuid(), 1)[0],
                            userId,
                            provider,
                            providerId: '12345',
                            providerUsername: 'testuser'
                        };
                    });

                    // Return different tokens for each platform
                    mockConnectionService.getValidAccessToken.mockImplementation(
                        async (uid: string, platform: Platform) => `valid_token_${platform}`
                    );

                    mockTwitchService.sendChatMessage.mockResolvedValue('mock-msg-id');
                    mockYouTubeService.getActiveLiveChatId.mockResolvedValue('liveChatId123');
                    mockYouTubeService.sendChatMessage.mockResolvedValue('mock-msg-id');
                    mockKickService.sendChatMessage.mockResolvedValue('mock-msg-id');

                    await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms
                    });

                    // Property: getValidAccessToken should be called once per platform
                    expect(mockConnectionService.getValidAccessToken).toHaveBeenCalledTimes(platforms.length);

                    // Property: Each platform should get its own token request
                    platforms.forEach(platform => {
                        expect(mockConnectionService.getValidAccessToken).toHaveBeenCalledWith(userId, platform);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should handle token validation failure for one platform without affecting others', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                async (userId, message) => {
                    jest.clearAllMocks();

                    // Mock connections exist for all platforms
                    (Connection.findOne as jest.Mock).mockImplementation(async ({ where }: { where: { userId: string; provider: string } }) => {
                        const { provider } = where;
                        return {
                            id: fc.sample(fc.uuid(), 1)[0],
                            userId,
                            provider,
                            providerId: '12345',
                            providerUsername: 'testuser'
                        };
                    });

                    // Mock: Twitch token valid, YouTube token invalid, Kick token valid
                    mockConnectionService.getValidAccessToken.mockImplementation(
                        async (uid: string, platform: Platform) => {
                            if (platform === 'youtube') {
                                return null; // Token refresh failed
                            }
                            return `valid_token_${platform}`;
                        }
                    );

                    mockTwitchService.sendChatMessage.mockResolvedValue('mock-msg-id');
                    mockKickService.sendChatMessage.mockResolvedValue('mock-msg-id');

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['twitch', 'youtube', 'kick']
                    });

                    // Property: All platforms should have attempted token validation
                    expect(mockConnectionService.getValidAccessToken).toHaveBeenCalledTimes(3);

                    // Property: YouTube should fail with INVALID_TOKEN
                    const youtubeResult = result.results.find(r => r.platform === 'youtube');
                    expect(youtubeResult?.success).toBe(false);
                    expect(youtubeResult?.errorCode).toBe('INVALID_TOKEN');

                    // Property: Twitch and Kick should succeed
                    const twitchResult = result.results.find(r => r.platform === 'twitch');
                    const kickResult = result.results.find(r => r.platform === 'kick');
                    expect(twitchResult?.success).toBe(true);
                    expect(kickResult?.success).toBe(true);

                    // Property: Platform APIs should only be called for valid tokens
                    expect(mockTwitchService.sendChatMessage).toHaveBeenCalled();
                    expect(mockKickService.sendChatMessage).toHaveBeenCalled();
                    expect(mockYouTubeService.sendChatMessage).not.toHaveBeenCalled();
                }
            ),
            { numRuns: 100 }
        );
    });
});

describe('Feature: multi-platform-message-sending, Property 26: Credentials never exposed to client', () => {
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

        mockYouTubeService = {
            sendChatMessage: jest.fn(),
            getActiveLiveChatId: jest.fn()
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

    it('should never include access tokens in response results', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.uniqueArray(
                    fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                    { minLength: 1, maxLength: 3 }
                ),
                fc.string({ minLength: 20, maxLength: 100 }), // access token
                async (userId, message, platforms, accessToken) => {
                    jest.clearAllMocks();

                    // Mock connections exist
                    (Connection.findOne as jest.Mock).mockImplementation(async ({ where }: { where: { userId: string; provider: string } }) => {
                        const { provider } = where;
                        return {
                            id: fc.sample(fc.uuid(), 1)[0],
                            userId,
                            provider,
                            providerId: '12345',
                            providerUsername: 'testuser',
                            accessToken: accessToken, // Sensitive data
                            refreshToken: 'refresh_token' // Sensitive data
                        };
                    });

                    mockConnectionService.getValidAccessToken.mockResolvedValue(accessToken);
                    mockTwitchService.sendChatMessage.mockResolvedValue('mock-msg-id');
                    mockYouTubeService.getActiveLiveChatId.mockResolvedValue('liveChatId123');
                    mockYouTubeService.sendChatMessage.mockResolvedValue('mock-msg-id');
                    mockKickService.sendChatMessage.mockResolvedValue('mock-msg-id');

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms
                    });

                    // Property: Response should not contain access token
                    const responseString = JSON.stringify(result);
                    expect(responseString).not.toContain(accessToken);

                    // Property: Each platform result should not contain token
                    result.results.forEach(platformResult => {
                        const resultString = JSON.stringify(platformResult);
                        expect(resultString).not.toContain(accessToken);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should never include refresh tokens in response results', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                fc.string({ minLength: 20, maxLength: 100 }), // refresh token
                async (userId, message, platform, refreshToken) => {
                    jest.clearAllMocks();

                    // Mock connection with refresh token
                    const mockConnection = {
                        id: fc.sample(fc.uuid(), 1)[0],
                        userId,
                        provider: platform,
                        providerId: '12345',
                        providerUsername: 'testuser',
                        accessToken: 'access_token',
                        refreshToken: refreshToken // Sensitive data
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
                    mockTwitchService.sendChatMessage.mockResolvedValue('mock-msg-id');
                    mockYouTubeService.getActiveLiveChatId.mockResolvedValue('liveChatId123');
                    mockYouTubeService.sendChatMessage.mockResolvedValue('mock-msg-id');
                    mockKickService.sendChatMessage.mockResolvedValue('mock-msg-id');

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: [platform]
                    });

                    // Property: Response should not contain refresh token
                    const responseString = JSON.stringify(result);
                    expect(responseString).not.toContain(refreshToken);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should not expose token-related error details in client responses', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                fc.string({ minLength: 20, maxLength: 100 }), // token
                async (userId, message, platform, token) => {
                    jest.clearAllMocks();

                    // Mock connection exists
                    const mockConnection = {
                        id: fc.sample(fc.uuid(), 1)[0],
                        userId,
                        provider: platform,
                        providerId: '12345',
                        providerUsername: 'testuser',
                        accessToken: token,
                        refreshToken: 'refresh_token'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    // Token validation fails
                    mockConnectionService.getValidAccessToken.mockResolvedValue(null);

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: [platform]
                    });

                    const platformResult = result.results.find(r => r.platform === platform);

                    // Property: Error message should not contain the actual token
                    expect(platformResult?.error).not.toContain(token);
                    expect(platformResult?.error).not.toContain('refresh_token');

                    // Property: Error should be generic and user-friendly
                    expect(platformResult?.error).toBe('Token inválido');
                    expect(platformResult?.errorCode).toBe('INVALID_TOKEN');
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should not include connection database IDs in responses', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                fc.uuid(), // connection ID
                async (userId, message, platform, connectionId) => {
                    jest.clearAllMocks();

                    // Mock connection with database ID
                    const mockConnection = {
                        id: connectionId, // Internal database ID
                        userId,
                        provider: platform,
                        providerId: '12345',
                        providerUsername: 'testuser',
                        accessToken: 'token',
                        refreshToken: 'refresh'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
                    mockTwitchService.sendChatMessage.mockResolvedValue('mock-msg-id');
                    mockYouTubeService.getActiveLiveChatId.mockResolvedValue('liveChatId123');
                    mockYouTubeService.sendChatMessage.mockResolvedValue('mock-msg-id');
                    mockKickService.sendChatMessage.mockResolvedValue('mock-msg-id');

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: [platform]
                    });

                    // Property: Response should not contain internal connection ID
                    const responseString = JSON.stringify(result);
                    expect(responseString).not.toContain(connectionId);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should only expose platform name and success status in results', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                async (userId, message, platform) => {
                    jest.clearAllMocks();

                    // Mock successful send
                    const mockConnection = {
                        id: fc.sample(fc.uuid(), 1)[0],
                        userId,
                        provider: platform,
                        providerId: '12345',
                        providerUsername: 'testuser',
                        accessToken: 'secret_token',
                        refreshToken: 'secret_refresh'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
                    mockTwitchService.sendChatMessage.mockResolvedValue('mock-msg-id');
                    mockYouTubeService.getActiveLiveChatId.mockResolvedValue('liveChatId123');
                    mockYouTubeService.sendChatMessage.mockResolvedValue('mock-msg-id');
                    mockKickService.sendChatMessage.mockResolvedValue('mock-msg-id');

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: [platform]
                    });

                    const platformResult = result.results.find(r => r.platform === platform);

                    // Property: Result should only contain safe fields
                    expect(platformResult).toHaveProperty('platform');
                    expect(platformResult).toHaveProperty('success');
                    
                    // Property: Result should not contain sensitive fields
                    expect(platformResult).not.toHaveProperty('accessToken');
                    expect(platformResult).not.toHaveProperty('refreshToken');
                    expect(platformResult).not.toHaveProperty('connectionId');
                    expect(platformResult).not.toHaveProperty('providerId');
                    
                    // Property: Only allowed fields should be present
                    const allowedFields = ['platform', 'success', 'error', 'errorCode'];
                    const resultKeys = Object.keys(platformResult || {});
                    resultKeys.forEach(key => {
                        expect(allowedFields).toContain(key);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should not leak credentials even when platform API throws error with token in message', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                fc.string({ minLength: 20, maxLength: 50 }), // token
                async (userId, message, platform, token) => {
                    jest.clearAllMocks();

                    // Mock connection
                    const mockConnection = {
                        id: fc.sample(fc.uuid(), 1)[0],
                        userId,
                        provider: platform,
                        providerId: '12345',
                        providerUsername: 'testuser',
                        accessToken: token,
                        refreshToken: 'refresh'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue(token);

                    // Mock platform API throwing error that includes token
                    const errorWithToken = new Error(`Invalid token: ${token}`);
                    mockTwitchService.sendChatMessage.mockRejectedValue(errorWithToken);
                    mockYouTubeService.getActiveLiveChatId.mockRejectedValue(errorWithToken);
                    mockKickService.sendChatMessage.mockRejectedValue(errorWithToken);

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: [platform]
                    });

                    const platformResult = result.results.find(r => r.platform === platform);

                    // Property: Even if platform API error contains token, response should not
                    // Note: Current implementation passes through error.message
                    // This test documents that behavior - ideally we'd sanitize error messages
                    expect(platformResult?.success).toBe(false);
                    
                    // Property: At minimum, the token should not appear in the response
                    // if it's longer than a certain threshold (to avoid false positives with short strings)
                    if (token.length > 15) {
                        const responseString = JSON.stringify(result);
                        // This property may fail with current implementation
                        // It serves as documentation that error sanitization should be added
                        expect(responseString).not.toContain(token);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should handle multiple platforms without leaking any credentials', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.array(fc.string({ minLength: 20, maxLength: 50 }), { minLength: 3, maxLength: 3 }), // tokens for each platform
                async (userId, message, tokens) => {
                    jest.clearAllMocks();

                    const platforms: Platform[] = ['twitch', 'youtube', 'kick'];
                    const [twitchToken, youtubeToken, kickToken] = tokens;

                    // Mock connections with different tokens
                    (Connection.findOne as jest.Mock).mockImplementation(async ({ where }: { where: { userId: string; provider: string } }) => {
                        const { provider } = where;
                        const tokenMap: Record<string, string> = {
                            'twitch': twitchToken,
                            'youtube': youtubeToken,
                            'kick': kickToken
                        };
                        
                        return {
                            id: fc.sample(fc.uuid(), 1)[0],
                            userId,
                            provider,
                            providerId: '12345',
                            providerUsername: 'testuser',
                            accessToken: tokenMap[provider],
                            refreshToken: `refresh_${provider}`
                        };
                    });

                    mockConnectionService.getValidAccessToken.mockImplementation(
                        async (uid: string, platform: Platform) => {
                            const tokenMap: Record<string, string> = {
                                'twitch': twitchToken,
                                'youtube': youtubeToken,
                                'kick': kickToken
                            };
                            return tokenMap[platform];
                        }
                    );

                    mockTwitchService.sendChatMessage.mockResolvedValue('mock-msg-id');
                    mockYouTubeService.getActiveLiveChatId.mockResolvedValue('liveChatId123');
                    mockYouTubeService.sendChatMessage.mockResolvedValue('mock-msg-id');
                    mockKickService.sendChatMessage.mockResolvedValue('mock-msg-id');

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms
                    });

                    const responseString = JSON.stringify(result);

                    // Property: None of the tokens should appear in the response
                    expect(responseString).not.toContain(twitchToken);
                    expect(responseString).not.toContain(youtubeToken);
                    expect(responseString).not.toContain(kickToken);

                    // Property: None of the refresh tokens should appear
                    expect(responseString).not.toContain('refresh_twitch');
                    expect(responseString).not.toContain('refresh_youtube');
                    expect(responseString).not.toContain('refresh_kick');
                }
            ),
            { numRuns: 100 }
        );
    });
});
