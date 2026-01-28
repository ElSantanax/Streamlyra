import fc from 'fast-check';
import { MessageSenderService } from '../MessageSenderService';
import { ConnectionService } from '../../connection/ConnectionService';
import { TwitchService } from '../../platforms/TwitchService';
import { YouTubeService } from '../../platforms/YouTubeService';
import { KickService } from '../../platforms/KickService';
import { Platform } from '../../../constants/platforms';
import { PlatformResult } from '../../../types/message.types';

/**
 * Property-Based Tests for MessageSenderService - TikTok Restriction
 * Feature: multi-platform-message-sending
 * 
 * Property 18: TikTok is never processed
 * Validates: Requirements 8.1, 8.3
 */

describe('Feature: multi-platform-message-sending, Property 18: TikTok is never processed', () => {
    let messageSenderService: MessageSenderService;
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let mockTwitchService: jest.Mocked<TwitchService>;
    let mockYouTubeService: jest.Mocked<YouTubeService>;
    let mockKickService: jest.Mocked<KickService>;

    beforeEach(() => {
        // Create mocks
        mockConnectionService = {
            getValidAccessToken: jest.fn()
        } as unknown as jest.Mocked<ConnectionService>;

        mockTwitchService = {} as unknown as jest.Mocked<TwitchService>;
        mockYouTubeService = {} as unknown as jest.Mocked<YouTubeService>;
        mockKickService = {} as unknown as jest.Mocked<KickService>;

        messageSenderService = new MessageSenderService(
            mockConnectionService,
            mockTwitchService,
            mockYouTubeService,
            mockKickService
        );
    });

    it('should never include tiktok in processed platforms, even when explicitly requested', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate platforms array that includes tiktok in various positions
                fc.array(
                    fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform, 'tiktok' as Platform),
                    { minLength: 1, maxLength: 10 }
                ).filter(platforms => platforms.includes('tiktok')), // Ensure tiktok is always present
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.uuid(),
                async (platforms, message, userId) => {
                    // Track which platforms were actually processed
                    const processedPlatforms: Platform[] = [];

                    // Spy on sendToPlatform to track what gets processed
                    jest.spyOn(
                        messageSenderService as unknown as { sendToPlatform: (...args: unknown[]) => Promise<PlatformResult> },
                        'sendToPlatform'
                    ).mockImplementation(async (...args: unknown[]) => {
                        const [_uid, _msg, platform] = args as [string, string, Platform];
                        processedPlatforms.push(platform);
                        
                        return {
                            platform,
                            success: true
                        };
                    });

                    // Execute sendMessage with platforms including tiktok
                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms
                    });

                    // Property: TikTok should NEVER be in the processed platforms list
                    expect(processedPlatforms).not.toContain('tiktok');

                    // Property: TikTok should NEVER be in the results
                    const resultPlatforms = result.results.map(r => r.platform);
                    expect(resultPlatforms).not.toContain('tiktok');

                    // Property: Only valid platforms (not tiktok) should be processed
                    const validPlatforms = platforms.filter(p => p !== 'tiktok');
                    expect(processedPlatforms.length).toBe(validPlatforms.length);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should filter out tiktok even when it appears multiple times in the platforms array', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate array with multiple tiktok entries
                fc.array(fc.constant('tiktok' as Platform), { minLength: 1, maxLength: 5 }),
                fc.array(
                    fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                    { minLength: 0, maxLength: 3 }
                ),
                fc.string({ minLength: 1, maxLength: 50 }),
                fc.uuid(),
                async (tiktokArray, otherPlatforms, message, userId) => {
                    // Interleave tiktok entries with other platforms
                    const platforms = [...tiktokArray, ...otherPlatforms];
                    
                    const processedPlatforms: Platform[] = [];

                    jest.spyOn(
                        messageSenderService as unknown as { sendToPlatform: (...args: unknown[]) => Promise<PlatformResult> },
                        'sendToPlatform'
                    ).mockImplementation(async (...args: unknown[]) => {
                        const [_uid, _msg, platform] = args as [string, string, Platform];
                        processedPlatforms.push(platform);
                        
                        return {
                            platform,
                            success: true
                        };
                    });

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms
                    });

                    // Property: No tiktok should be processed, regardless of how many times it appears
                    expect(processedPlatforms).not.toContain('tiktok');
                    expect(result.results.map(r => r.platform)).not.toContain('tiktok');

                    // Property: Count of processed platforms should equal count of non-tiktok platforms
                    const nonTiktokCount = otherPlatforms.length;
                    expect(processedPlatforms.length).toBe(nonTiktokCount);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should handle the case when only tiktok is requested by processing nothing', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 1, maxLength: 50 }),
                fc.uuid(),
                async (message, userId) => {
                    const platforms: Platform[] = ['tiktok'];
                    const processedPlatforms: Platform[] = [];

                    jest.spyOn(
                        messageSenderService as unknown as { sendToPlatform: (...args: unknown[]) => Promise<PlatformResult> },
                        'sendToPlatform'
                    ).mockImplementation(async (...args: unknown[]) => {
                        const [_uid, _msg, platform] = args as [string, string, Platform];
                        processedPlatforms.push(platform);
                        
                        return {
                            platform,
                            success: true
                        };
                    });

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms
                    });

                    // Property: When only tiktok is requested, nothing should be processed
                    expect(processedPlatforms.length).toBe(0);
                    expect(result.results.length).toBe(0);

                    // Property: Result should indicate no success (no platforms processed)
                    expect(result.success).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should never call platform-specific methods for tiktok', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(
                    fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform, 'tiktok' as Platform),
                    { minLength: 1, maxLength: 8 }
                ).filter(platforms => platforms.includes('tiktok')),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.uuid(),
                async (platforms, message, userId) => {
                    // Track calls to sendToPlatform
                    const platformCalls: Platform[] = [];

                    jest.spyOn(
                        messageSenderService as unknown as { sendToPlatform: (...args: unknown[]) => Promise<PlatformResult> },
                        'sendToPlatform'
                    ).mockImplementation(async (...args: unknown[]) => {
                        const [_uid, _msg, platform] = args as [string, string, Platform];
                        platformCalls.push(platform);
                        
                        return {
                            platform,
                            success: true
                        };
                    });

                    await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms
                    });

                    // Property: sendToPlatform should never be called with 'tiktok'
                    expect(platformCalls).not.toContain('tiktok');

                    // Property: All calls should be for valid platforms only
                    platformCalls.forEach(platform => {
                        expect(['twitch', 'youtube', 'kick']).toContain(platform);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should preserve order and integrity of non-tiktok platforms when filtering', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate a specific pattern: valid platform, tiktok, valid platform, tiktok, etc.
                fc.array(
                    fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                    { minLength: 2, maxLength: 5 }
                ),
                fc.string({ minLength: 1, maxLength: 50 }),
                fc.uuid(),
                async (validPlatforms, message, userId) => {
                    // Interleave valid platforms with tiktok
                    const platforms: Platform[] = [];
                    validPlatforms.forEach((platform, index) => {
                        platforms.push(platform);
                        if (index < validPlatforms.length - 1) {
                            platforms.push('tiktok');
                        }
                    });

                    const processedPlatforms: Platform[] = [];

                    jest.spyOn(
                        messageSenderService as unknown as { sendToPlatform: (...args: unknown[]) => Promise<PlatformResult> },
                        'sendToPlatform'
                    ).mockImplementation(async (...args: unknown[]) => {
                        const [_uid, _msg, platform] = args as [string, string, Platform];
                        processedPlatforms.push(platform);
                        
                        return {
                            platform,
                            success: true
                        };
                    });

                    await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms
                    });

                    // Property: All valid platforms should be processed in their original order
                    expect(processedPlatforms).toEqual(validPlatforms);

                    // Property: No tiktok in processed list
                    expect(processedPlatforms).not.toContain('tiktok');
                }
            ),
            { numRuns: 100 }
        );
    });
});
