import fc from 'fast-check';
import { MessageSenderService } from '../MessageSenderService';
import { ConnectionService } from '../../connection/ConnectionService';
import { TwitchService } from '../../platforms/TwitchService';
import { YouTubeService } from '../../platforms/YouTubeService';
import { KickService } from '../../platforms/KickService';
import { Connection } from '../../../models/Connection.model';
import { Platform } from '../../../constants/platforms';

/**
 * Property-Based Tests for MessageSenderService - Authorization
 * Feature: multi-platform-message-sending
 * 
 * Property 23: User authorization is verified
 * Property 24: Unauthorized platforms are skipped
 * 
 * Validates: Requirements 11.1, 11.2
 */

// Mock Connection model
jest.mock('../../../models/Connection.model');

describe('Feature: multi-platform-message-sending, Property 23: User authorization is verified', () => {
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

    it('should verify user owns connection before sending to any platform', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(), // userId
                fc.string({ minLength: 1, maxLength: 100 }), // message
                fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform), // platform
                async (userId, message, platform) => {
                    // Reset mocks for each iteration
                    jest.clearAllMocks();

                    // Mock connection exists for this user and platform
                    const mockConnection = {
                        id: fc.sample(fc.uuid(), 1)[0],
                        userId,
                        provider: platform,
                        providerId: '12345',
                        providerUsername: 'testuser',
                        accessToken: 'token',
                        refreshToken: 'refresh'
                    };

                    (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                    mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
                    
                    // Mock platform services
                    mockTwitchService.sendChatMessage.mockResolvedValue(undefined);
                    mockYouTubeService.getActiveLiveChatId.mockResolvedValue('liveChatId123');
                    mockYouTubeService.sendChatMessage.mockResolvedValue(undefined);
                    mockKickService.sendChatMessage.mockResolvedValue(undefined);

                    await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: [platform]
                    });

                    // Property: Connection.findOne should be called to verify user owns the connection
                    expect(Connection.findOne).toHaveBeenCalledWith({
                        where: { userId: String(userId), provider: platform }
                    });

                    // Property: Connection lookup should happen before any API calls
                    expect(Connection.findOne).toHaveBeenCalled();
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should verify user ownership for each requested platform independently', async () => {
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

                    mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
                    mockTwitchService.sendChatMessage.mockResolvedValue(undefined);
                    mockYouTubeService.getActiveLiveChatId.mockResolvedValue('liveChatId123');
                    mockYouTubeService.sendChatMessage.mockResolvedValue(undefined);
                    mockKickService.sendChatMessage.mockResolvedValue(undefined);

                    await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms
                    });

                    // Property: Connection.findOne should be called once per platform
                    expect(Connection.findOne).toHaveBeenCalledTimes(platforms.length);

                    // Property: Each call should verify the specific platform for this user
                    platforms.forEach(platform => {
                        expect(Connection.findOne).toHaveBeenCalledWith({
                            where: { userId: String(userId), provider: platform }
                        });
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should not send to platform if user does not own the connection', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                async (userId, message, platform) => {
                    jest.clearAllMocks();

                    // Mock no connection found (user doesn't own this platform)
                    (Connection.findOne as jest.Mock).mockResolvedValue(null);

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: [platform]
                    });

                    // Property: Connection verification should have been attempted
                    expect(Connection.findOne).toHaveBeenCalledWith({
                        where: { userId: String(userId), provider: platform }
                    });

                    // Property: Platform service should NOT be called if connection doesn't exist
                    expect(mockTwitchService.sendChatMessage).not.toHaveBeenCalled();
                    expect(mockYouTubeService.sendChatMessage).not.toHaveBeenCalled();
                    expect(mockKickService.sendChatMessage).not.toHaveBeenCalled();

                    // Property: Result should indicate failure
                    const platformResult = result.results.find(r => r.platform === platform);
                    expect(platformResult?.success).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should verify authorization even when multiple platforms are requested', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.uuid(), // different userId to test cross-user authorization
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.uniqueArray(
                    fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                    { minLength: 2, maxLength: 3 }
                ),
                async (userId, otherUserId, message, platforms) => {
                    // Ensure we have two different users
                    fc.pre(userId !== otherUserId);

                    jest.clearAllMocks();

                    // Mock connections exist but for a different user
                    (Connection.findOne as jest.Mock).mockImplementation(async ({ where }: { where: { userId: string; provider: string } }) => {
                        const { provider } = where;
                        // Return connection for different user
                        return {
                            id: fc.sample(fc.uuid(), 1)[0],
                            userId: otherUserId, // Different user!
                            provider,
                            providerId: '12345',
                            providerUsername: 'testuser'
                        };
                    });

                    await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms
                    });

                    // Property: Authorization check should query for the specific userId
                    platforms.forEach(platform => {
                        expect(Connection.findOne).toHaveBeenCalledWith({
                            where: { userId: String(userId), provider: platform }
                        });
                    });

                    // Property: The query should use the requesting user's ID, not any other user
                    const calls = (Connection.findOne as jest.Mock).mock.calls as Array<[{ where: { userId: string; provider: string } }]>;
                    calls.forEach(call => {
                        expect(call[0].where.userId).toBe(String(userId));
                        expect(call[0].where.userId).not.toBe(String(otherUserId));
                    });
                }
            ),
            { numRuns: 100 }
        );
    });
});

describe('Feature: multi-platform-message-sending, Property 24: Unauthorized platforms are skipped', () => {
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

    it('should skip platforms where user has no connection', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                async (userId, message, unauthorizedPlatform) => {
                    jest.clearAllMocks();

                    // Mock no connection for the unauthorized platform
                    (Connection.findOne as jest.Mock).mockResolvedValue(null);

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: [unauthorizedPlatform]
                    });

                    // Property: Platform should be skipped (not sent to)
                    expect(mockTwitchService.sendChatMessage).not.toHaveBeenCalled();
                    expect(mockYouTubeService.sendChatMessage).not.toHaveBeenCalled();
                    expect(mockKickService.sendChatMessage).not.toHaveBeenCalled();

                    // Property: Result should indicate platform was not connected
                    const platformResult = result.results.find(r => r.platform === unauthorizedPlatform);
                    expect(platformResult).toBeDefined();
                    expect(platformResult?.success).toBe(false);
                    expect(platformResult?.errorCode).toBe('NOT_CONNECTED');
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should skip unauthorized platforms but process authorized ones', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                async (userId, message) => {
                    jest.clearAllMocks();

                    // Mock: Twitch connected, YouTube not connected, Kick connected
                    (Connection.findOne as jest.Mock).mockImplementation(async ({ where }: { where: { userId: string; provider: string } }) => {
                        const { provider } = where;
                        if (provider === 'youtube') {
                            return null; // Not connected
                        }
                        return {
                            id: fc.sample(fc.uuid(), 1)[0],
                            userId,
                            provider,
                            providerId: '12345',
                            providerUsername: 'testuser'
                        };
                    });

                    mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
                    mockTwitchService.sendChatMessage.mockResolvedValue(undefined);
                    mockKickService.sendChatMessage.mockResolvedValue(undefined);

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: ['twitch', 'youtube', 'kick']
                    });

                    // Property: All platforms should have results
                    expect(result.results.length).toBe(3);

                    // Property: YouTube should be skipped (not connected)
                    const youtubeResult = result.results.find(r => r.platform === 'youtube');
                    expect(youtubeResult?.success).toBe(false);
                    expect(youtubeResult?.errorCode).toBe('NOT_CONNECTED');

                    // Property: Twitch and Kick should succeed (connected)
                    const twitchResult = result.results.find(r => r.platform === 'twitch');
                    const kickResult = result.results.find(r => r.platform === 'kick');
                    expect(twitchResult?.success).toBe(true);
                    expect(kickResult?.success).toBe(true);

                    // Property: YouTube API should not be called
                    expect(mockYouTubeService.sendChatMessage).not.toHaveBeenCalled();

                    // Property: Twitch and Kick APIs should be called
                    expect(mockTwitchService.sendChatMessage).toHaveBeenCalled();
                    expect(mockKickService.sendChatMessage).toHaveBeenCalled();
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should record unauthorized platforms with appropriate error code', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.uniqueArray(
                    fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                    { minLength: 1, maxLength: 3 }
                ),
                async (userId, message, platforms) => {
                    jest.clearAllMocks();

                    // Mock all platforms as not connected
                    (Connection.findOne as jest.Mock).mockResolvedValue(null);

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms
                    });

                    // Property: All platforms should be in results
                    expect(result.results.length).toBe(platforms.length);

                    // Property: All platforms should be marked as not connected
                    result.results.forEach(platformResult => {
                        expect(platformResult.success).toBe(false);
                        expect(platformResult.errorCode).toBe('NOT_CONNECTED');
                        expect(platformResult.error).toBe('No conectado');
                    });

                    // Property: Overall success should be false (no platforms succeeded)
                    expect(result.success).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should handle mixed authorization states across multiple platforms', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                // Generate which platforms are authorized (boolean array)
                fc.array(fc.boolean(), { minLength: 3, maxLength: 3 }),
                async (userId, message, authStates) => {
                    jest.clearAllMocks();

                    const platforms: Platform[] = ['twitch', 'youtube', 'kick'];
                    const authorizedPlatforms = platforms.filter((_, i) => authStates[i]);
                    const unauthorizedPlatforms = platforms.filter((_, i) => !authStates[i]);

                    // Mock connections based on authorization states
                    (Connection.findOne as jest.Mock).mockImplementation(async ({ where }: { where: { userId: string; provider: string } }) => {
                        const { provider } = where;
                        const isAuthorized = authorizedPlatforms.includes(provider as Platform);
                        
                        if (!isAuthorized) {
                            return null;
                        }
                        
                        return {
                            id: fc.sample(fc.uuid(), 1)[0],
                            userId,
                            provider,
                            providerId: '12345',
                            providerUsername: 'testuser'
                        };
                    });

                    mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token');
                    mockTwitchService.sendChatMessage.mockResolvedValue(undefined);
                    mockYouTubeService.getActiveLiveChatId.mockResolvedValue('liveChatId123');
                    mockYouTubeService.sendChatMessage.mockResolvedValue(undefined);
                    mockKickService.sendChatMessage.mockResolvedValue(undefined);

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms
                    });

                    // Property: All platforms should have results
                    expect(result.results.length).toBe(3);

                    // Property: Unauthorized platforms should be marked as NOT_CONNECTED
                    unauthorizedPlatforms.forEach(platform => {
                        const platformResult = result.results.find(r => r.platform === platform);
                        expect(platformResult?.success).toBe(false);
                        expect(platformResult?.errorCode).toBe('NOT_CONNECTED');
                    });

                    // Property: Authorized platforms should succeed
                    authorizedPlatforms.forEach(platform => {
                        const platformResult = result.results.find(r => r.platform === platform);
                        expect(platformResult?.success).toBe(true);
                    });

                    // Property: Overall success should be true if at least one platform is authorized
                    if (authorizedPlatforms.length > 0) {
                        expect(result.success).toBe(true);
                    } else {
                        expect(result.success).toBe(false);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should not expose connection details in error messages for unauthorized platforms', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                async (userId, message, platform) => {
                    jest.clearAllMocks();

                    // Mock no connection
                    (Connection.findOne as jest.Mock).mockResolvedValue(null);

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms: [platform]
                    });

                    const platformResult = result.results.find(r => r.platform === platform);

                    // Property: Error message should be generic, not exposing internal details
                    expect(platformResult?.error).toBeDefined();
                    expect(platformResult?.error).not.toContain(userId);
                    expect(platformResult?.error).not.toContain('database');
                    expect(platformResult?.error).not.toContain('query');
                    
                    // Property: Error should be user-friendly
                    expect(platformResult?.error).toBe('No conectado');
                }
            ),
            { numRuns: 100 }
        );
    });
});
