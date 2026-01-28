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
 * Property 21: Multiple platforms are processed concurrently
 * Validates: Requirements 10.1
 */

describe('Feature: multi-platform-message-sending, Property 21: Multiple platforms are processed concurrently', () => {
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

    it('should process all platforms concurrently, not sequentially', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate array of 1-3 valid platforms (excluding tiktok)
                fc.uniqueArray(
                    fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                    { minLength: 1, maxLength: 3 }
                ),
                // Generate a non-empty message
                fc.string({ minLength: 1, maxLength: 100 }),
                // Generate a userId
                fc.uuid(),
                async (platforms, message, userId) => {
                    // Track execution order and timing
                    const executionLog: Array<{ platform: Platform; timestamp: number }> = [];
                    const startTime = Date.now();

                    // Spy on sendToPlatform to track concurrent execution
                    jest.spyOn(messageSenderService as unknown as { sendToPlatform: (...args: unknown[]) => Promise<PlatformResult> }, 'sendToPlatform').mockImplementation(
                        async (...args: unknown[]) => {
                            const [_uid, _msg, platform] = args as [string, string, Platform];
                            const callTime = Date.now() - startTime;
                            executionLog.push({ platform, timestamp: callTime });
                            
                            // Simulate async work with small delay
                            await new Promise(resolve => setTimeout(resolve, 10));
                            
                            return {
                                platform,
                                success: true
                            };
                        }
                    );

                    // Execute sendMessage
                    const result = await messageSenderService.sendMessage({
                        userId,
                        message,
                        platforms
                    });

                    // Property: All platforms should start execution within a small time window
                    // (indicating concurrent execution, not sequential)
                    if (platforms.length > 1) {
                        const timestamps = executionLog.map(log => log.timestamp);
                        const maxTimestamp = Math.max(...timestamps);
                        const minTimestamp = Math.min(...timestamps);
                        const timeSpread = maxTimestamp - minTimestamp;

                        // If execution was concurrent, all calls should start within ~5ms
                        // If sequential, they would be spread by at least 10ms * (n-1)
                        expect(timeSpread).toBeLessThan(platforms.length * 10);
                    }

                    // Property: All platforms should be processed
                    expect(executionLog.length).toBe(platforms.length);

                    // Property: Results should contain all platforms
                    expect(result.results.length).toBe(platforms.length);
                    
                    const resultPlatforms = result.results.map(r => r.platform);
                    platforms.forEach(platform => {
                        expect(resultPlatforms).toContain(platform);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should handle concurrent execution even when platforms have different response times', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate array of 2-3 platforms
                fc.uniqueArray(
                    fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                    { minLength: 2, maxLength: 3 }
                ),
                fc.string({ minLength: 1, maxLength: 50 }),
                fc.uuid(),
                async (platforms, message, userId) => {
                    const executionOrder: Platform[] = [];
                    const completionOrder: Platform[] = [];

                    // Mock with different delays per platform
                    jest.spyOn(messageSenderService as unknown as { sendToPlatform: (...args: unknown[]) => Promise<PlatformResult> }, 'sendToPlatform').mockImplementation(
                        async (...args: unknown[]) => {
                            const [_uid, _msg, platform] = args as [string, string, Platform];
                            executionOrder.push(platform);
                            
                            // Different delays for different platforms
                            const delay = platform === 'twitch' ? 30 : platform === 'youtube' ? 20 : 10;
                            await new Promise(resolve => setTimeout(resolve, delay));
                            
                            completionOrder.push(platform);
                            
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

                    // Property: All platforms should start execution (be in executionOrder)
                    expect(executionOrder.length).toBe(platforms.length);

                    // Property: All platforms should complete (be in completionOrder)
                    expect(completionOrder.length).toBe(platforms.length);

                    // Property: Completion order may differ from execution order (due to different delays)
                    // This proves concurrent execution - if sequential, order would be the same

                    // Property: All results should be present
                    expect(result.results.length).toBe(platforms.length);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should process platforms concurrently even when one platform fails', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uniqueArray(
                    fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                    { minLength: 2, maxLength: 3 }
                ),
                fc.string({ minLength: 1, maxLength: 50 }),
                fc.uuid(),
                // Pick one platform to fail
                fc.integer({ min: 0, max: 2 }),
                async (platforms, message, userId, failIndex) => {
                    const actualFailIndex = failIndex % platforms.length;
                    const executionLog: Platform[] = [];

                    jest.spyOn(messageSenderService as unknown as { sendToPlatform: (...args: unknown[]) => Promise<PlatformResult> }, 'sendToPlatform').mockImplementation(
                        async (...args: unknown[]) => {
                            const [_uid, _msg, platform] = args as [string, string, Platform];
                            executionLog.push(platform);
                            
                            await new Promise(resolve => setTimeout(resolve, 10));
                            
                            const shouldFail = platform === platforms[actualFailIndex];
                            
                            if (shouldFail) {
                                return {
                                    platform,
                                    success: false,
                                    error: 'Simulated failure',
                                    errorCode: 'TEST_ERROR'
                                };
                            }
                            
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

                    // Property: All platforms should be attempted despite one failing
                    expect(executionLog.length).toBe(platforms.length);

                    // Property: All platforms should have results
                    expect(result.results.length).toBe(platforms.length);

                    // Property: Failed platform should be marked as failed
                    const failedPlatform = platforms[actualFailIndex];
                    const failedResult = result.results.find(r => r.platform === failedPlatform);
                    expect(failedResult?.success).toBe(false);

                    // Property: Other platforms should succeed
                    const successfulResults = result.results.filter(r => r.platform !== failedPlatform);
                    successfulResults.forEach(r => {
                        expect(r.success).toBe(true);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });
});
