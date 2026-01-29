import fc from 'fast-check';
import { MessageSenderService } from '../MessageSenderService';
import { ConnectionService } from '../../connection/ConnectionService';
import { TwitchService } from '../../platforms/TwitchService';
import { YouTubeService } from '../../platforms/YouTubeService';
import { KickService } from '../../platforms/KickService';
import { Platform } from '../../../constants/platforms';
import { PlatformResult } from '../../../types/message.types';

/**
 * Property-Based Tests for MessageSenderService
 * Feature: multi-platform-message-sending
 * 
 * Property 22: Results are aggregated into single response
 * Validates: Requirements 10.3
 */

describe('Feature: multi-platform-message-sending, Property 22: Results are aggregated into single response', () => {
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

    it('should aggregate all platform results into a single response', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate array of 1-3 valid platforms
                fc.uniqueArray(
                    fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                    { minLength: 1, maxLength: 3 }
                ),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.uuid(),
                async (platforms, message, userId) => {
                    // Mock sendToPlatform to return predictable results
                    jest.spyOn(messageSenderService as unknown as { sendToPlatform: (...args: unknown[]) => Promise<PlatformResult> }, 'sendToPlatform').mockImplementation(
                        async (...args: unknown[]) => {
                            const [, , platform] = args as [string, string, Platform];
                            return {
                                platform,
                                success: true
                            };
                        }
                    );

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms
                    });

                    // Property: Response should contain results array
                    expect(result.results).toBeDefined();
                    expect(Array.isArray(result.results)).toBe(true);

                    // Property: Results array should contain exactly one result per platform
                    expect(result.results.length).toBe(platforms.length);

                    // Property: Each requested platform should have a result
                    const resultPlatforms = result.results.map(r => r.platform);
                    platforms.forEach(platform => {
                        expect(resultPlatforms).toContain(platform);
                    });

                    // Property: No duplicate platform results
                    const uniquePlatforms = new Set(resultPlatforms);
                    expect(uniquePlatforms.size).toBe(platforms.length);

                    // Property: Response should have success field
                    expect(typeof result.success).toBe('boolean');

                    // Property: Response should have timestamp field
                    expect(result.timestamp).toBeDefined();
                    expect(typeof result.timestamp).toBe('string');
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should set success=true when at least one platform succeeds', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate array of 2-3 platforms
                fc.uniqueArray(
                    fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                    { minLength: 2, maxLength: 3 }
                ),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.uuid(),
                // Generate which platforms should succeed (at least one)
                fc.array(fc.boolean(), { minLength: 2, maxLength: 3 }).filter(arr => arr.some(v => v)),
                async (platforms, message, userId, successFlags) => {
                    // Ensure we have the right number of success flags
                    const flags = successFlags.slice(0, platforms.length);
                    if (!flags.some(v => v)) {
                        flags[0] = true; // Ensure at least one succeeds
                    }

                    // Mock sendToPlatform with mixed success/failure
                    jest.spyOn(messageSenderService as unknown as { sendToPlatform: (...args: unknown[]) => Promise<PlatformResult> }, 'sendToPlatform').mockImplementation(
                        async (...args: unknown[]) => {
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const [_uid, _msg, platform] = args as [string, string, Platform];
                            const index = platforms.indexOf(platform);
                            const shouldSucceed = flags[index];

                            if (shouldSucceed) {
                                return {
                                    platform,
                                    success: true
                                };
                            } else {
                                return {
                                    platform,
                                    success: false,
                                    error: 'Test failure',
                                    errorCode: 'TEST_ERROR'
                                };
                            }
                        }
                    );

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms
                    });

                    // Property: If at least one platform succeeded, overall success should be true
                    const hasSuccess = result.results.some(r => r.success);
                    expect(result.success).toBe(hasSuccess);
                    expect(result.success).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should set success=false when all platforms fail', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uniqueArray(
                    fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                    { minLength: 1, maxLength: 3 }
                ),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.uuid(),
                async (platforms, message, userId) => {
                    // Mock sendToPlatform to always fail
                    jest.spyOn(messageSenderService as unknown as { sendToPlatform: (...args: unknown[]) => Promise<PlatformResult> }, 'sendToPlatform').mockImplementation(
                        async (...args: unknown[]) => {
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const [_uid, _msg, platform] = args as [string, string, Platform];
                            return {
                                platform,
                                success: false,
                                error: 'Test failure',
                                errorCode: 'TEST_ERROR'
                            };
                        }
                    );

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms
                    });

                    // Property: If all platforms failed, overall success should be false
                    const allFailed = result.results.every(r => !r.success);
                    expect(allFailed).toBe(true);
                    expect(result.success).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should preserve individual platform result details in aggregated response', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uniqueArray(
                    fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                    { minLength: 1, maxLength: 3 }
                ),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.uuid(),
                async (platforms, message, userId) => {
                    // Create expected results with specific error details
                    const expectedResults: Map<Platform, PlatformResult> = new Map();
                    
                    platforms.forEach((platform, index) => {
                        const shouldSucceed = index % 2 === 0;
                        expectedResults.set(platform, {
                            platform,
                            success: shouldSucceed,
                            ...(shouldSucceed ? {} : {
                                error: `Error for ${platform}`,
                                errorCode: `${platform.toUpperCase()}_ERROR`
                            })
                        });
                    });

                    // Mock sendToPlatform to return expected results
                    jest.spyOn(messageSenderService as unknown as { sendToPlatform: (...args: unknown[]) => Promise<PlatformResult> }, 'sendToPlatform').mockImplementation(
                        async (...args: unknown[]) => {
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const [_uid, _msg, platform] = args as [string, string, Platform];
                            return expectedResults.get(platform)!;
                        }
                    );

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms
                    });

                    // Property: Each platform result should preserve its details
                    result.results.forEach(platformResult => {
                        const expected = expectedResults.get(platformResult.platform);
                        expect(platformResult.platform).toBe(expected?.platform);
                        expect(platformResult.success).toBe(expected?.success);
                        
                        if (!expected?.success) {
                            expect(platformResult.error).toBe(expected?.error);
                            expect(platformResult.errorCode).toBe(expected?.errorCode);
                        }
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should include valid ISO timestamp in aggregated response', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uniqueArray(
                    fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                    { minLength: 1, maxLength: 3 }
                ),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.uuid(),
                async (platforms, message, userId) => {
                    jest.spyOn(messageSenderService as unknown as { sendToPlatform: (...args: unknown[]) => Promise<PlatformResult> }, 'sendToPlatform').mockImplementation(
                        async (...args: unknown[]) => {
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const [_uid, _msg, platform] = args as [string, string, Platform];
                            return { platform, success: true };
                        }
                    );

                    const beforeTime = new Date();
                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms
                    });
                    const afterTime = new Date();

                    // Property: Timestamp should be a valid ISO string
                    expect(result.timestamp).toBeDefined();
                    const timestamp = new Date(result.timestamp);
                    expect(timestamp.toString()).not.toBe('Invalid Date');

                    // Property: Timestamp should be between before and after times
                    expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
                    expect(timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should aggregate results regardless of platform execution order', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Always use all 3 platforms for this test
                fc.constant(['twitch', 'youtube', 'kick'] as Platform[]),
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.uuid(),
                async (platforms, message, userId) => {
                    // Mock with different delays to vary completion order
                    jest.spyOn(messageSenderService as unknown as { sendToPlatform: (...args: unknown[]) => Promise<PlatformResult> }, 'sendToPlatform').mockImplementation(
                        async (...args: unknown[]) => {
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const [_uid, _msg, platform] = args as [string, string, Platform];
                            
                            // Random delay to vary completion order
                            const delay = Math.random() * 20;
                            await new Promise(resolve => setTimeout(resolve, delay));
                            
                            return {
                                platform,
                                success: true
                            };
                        }
                    );

                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms
                    });

                    // Property: All platforms should be in results regardless of completion order
                    expect(result.results.length).toBe(3);
                    expect(result.results.map(r => r.platform).sort()).toEqual(['kick', 'twitch', 'youtube']);

                    // Property: Success should be true (all succeeded)
                    expect(result.success).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });
});
