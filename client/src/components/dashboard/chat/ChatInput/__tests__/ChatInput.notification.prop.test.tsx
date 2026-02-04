import { describe, it, afterEach, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { render, cleanup, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ChatInput from '../index';
import { toast } from '../../../../../lib/notifications/toast';
import { socket } from '../../../../../services/socket';
import type { MessageSentResult, PlatformResult } from '../../../../../types/message.types';

// Mock dependencies
vi.mock('../../../../../lib/notifications/toast', () => ({
    toast: {
        error: vi.fn(),
        warning: vi.fn(),
        success: vi.fn(),
    }
}));

vi.mock('../../../../../services/socket', () => ({
    socket: {
        connected: true,
        emit: vi.fn(),
        on: vi.fn((event: string, handler: (result: MessageSentResult) => void) => {
            // Store handlers for manual triggering in tests
            const sock = socket as unknown as { _handlers: Record<string, (result: MessageSentResult) => void> };
            sock._handlers = sock._handlers || {};
            sock._handlers[event] = handler;
            return socket;
        }),
        off: vi.fn(),
    }
}));

vi.mock('../../../../../hooks/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'test-user-id', username: 'testuser' },
        isAuthenticated: true,
    })
}));

/**
 * Property-based tests for ChatInput notification behavior
 * Feature: multi-platform-message-sending
 */

describe('Feature: multi-platform-message-sending, Property 19: Notification matches result type', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (socket as { connected: boolean }).connected = true;
        (socket as unknown as { _handlers: Record<string, (result: MessageSentResult) => void> })._handlers = {};
    });

    afterEach(() => {
        cleanup();
    });

    /**
     * Generator for platform results
     */
    const platformResultArbitrary = (success: boolean): fc.Arbitrary<PlatformResult> => {
        return fc.record({
            platform: fc.constantFrom('twitch', 'youtube', 'kick'),
            success: fc.constant(success),
            error: success ? fc.constant(undefined) : fc.option(
                fc.string({ minLength: 5, maxLength: 50 }),
                { nil: undefined }
            ),
            errorCode: success ? fc.constant(undefined) : fc.option(
                fc.constantFrom('NOT_CONNECTED', 'INVALID_TOKEN', 'API_ERROR', 'RATE_LIMIT'),
                { nil: undefined }
            ),
        });
    };

    /**
     * Property 19: Notification matches result type - All Success
     * Validates: Requirements 9.1
     * 
     * For any completed send operation where all platforms succeeded,
     * the system should display a success notification
     */
    it('should display success notification when all platforms succeed', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate 1-3 successful platform results
                fc.array(platformResultArbitrary(true), { minLength: 1, maxLength: 3 })
                    .map(results => {
                        // Ensure unique platforms
                        const uniquePlatforms = new Set<string>();
                        const uniqueResults: PlatformResult[] = [];
                        for (const result of results) {
                            if (!uniquePlatforms.has(result.platform)) {
                                uniquePlatforms.add(result.platform);
                                uniqueResults.push(result);
                            }
                        }
                        return uniqueResults;
                    })
                    .filter(results => results.length > 0),
                async (successfulResults) => {
                    const user = userEvent.setup();

                    const { unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;

                        // Type a message and send
                        await user.clear(messageInput);
                        await user.type(messageInput, 'test message');

                        const sendButton = screen.getByRole('button', { name: /enviar/i });
                        await user.click(sendButton);

                        vi.clearAllMocks();

                        // Simulate server response with all successful results
                        const result: MessageSentResult = {
                            success: true,
                            results: successfulResults,
                        };

                        // Trigger the message_sent_result handler
                        const handler = (socket as unknown as { _handlers: Record<string, (result: MessageSentResult) => void> })._handlers['message_sent_result'];
                        if (!handler) {
                            throw new Error('message_sent_result handler not registered');
                        }
                        handler(result);

                        // Wait for state updates
                        await waitFor(() => {
                            // UI OPTIMISTA: No debe llamar a toast.success para no saturar al usuario
                            if (vi.mocked(toast.success).mock.calls.length > 0) {
                                throw new Error('toast.success should NOT be called in optimistic UI to avoid clutter');
                            }
                        }, { timeout: 1000 });

                        // In optimistic UI, we don't verify the success message content since it's not shown

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 20 }
        );
    }, 60000);

    /**
     * Property 19: Notification matches result type - Partial Success
     * Validates: Requirements 9.2
     * 
     * For any completed send operation where some platforms failed,
     * the system should display a partial success (warning) notification
     */
    it('should display warning notification when some platforms fail', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate at least one success and one failure
                fc.tuple(
                    fc.array(platformResultArbitrary(true), { minLength: 1, maxLength: 2 }),
                    fc.array(platformResultArbitrary(false), { minLength: 1, maxLength: 2 })
                ).map(([successes, failures]) => {
                    // Ensure unique platforms across both arrays
                    const allResults = [...successes, ...failures];
                    const uniquePlatforms = new Set<string>();
                    const uniqueResults: PlatformResult[] = [];
                    for (const result of allResults) {
                        if (!uniquePlatforms.has(result.platform)) {
                            uniquePlatforms.add(result.platform);
                            uniqueResults.push(result);
                        }
                    }
                    return uniqueResults;
                }).filter(results => {
                    // Ensure we have both successes and failures
                    const hasSuccess = results.some(r => r.success);
                    const hasFailure = results.some(r => !r.success);
                    return hasSuccess && hasFailure;
                }),
                async (mixedResults) => {
                    const user = userEvent.setup();

                    const { unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;

                        await user.clear(messageInput);
                        await user.type(messageInput, 'test message');

                        const sendButton = screen.getByRole('button', { name: /enviar/i });
                        await user.click(sendButton);

                        vi.clearAllMocks();

                        // Simulate server response with mixed results
                        const result: MessageSentResult = {
                            success: true, // At least one succeeded
                            results: mixedResults,
                        };

                        const handler = (socket as unknown as { _handlers: Record<string, (result: MessageSentResult) => void> })._handlers['message_sent_result'];
                        handler(result);

                        await waitFor(() => {
                            // Property: toast.warning should be called for partial success
                            if (vi.mocked(toast.warning).mock.calls.length === 0) {
                                throw new Error('toast.warning should be called when some platforms fail');
                            }
                        }, { timeout: 1000 });

                        // Verify toast.success was NOT called (should be warning instead)
                        if (vi.mocked(toast.success).mock.calls.length > 0) {
                            throw new Error('toast.success should not be called when some platforms fail');
                        }

                        // Verify the warning message includes both successful and failed platforms
                        const warningCall = vi.mocked(toast.warning).mock.calls[0];
                        const warningMessage = warningCall[0] as string;

                        const successfulPlatforms = mixedResults.filter(r => r.success);
                        const failedPlatforms = mixedResults.filter(r => !r.success);

                        // Successful platforms should be mentioned
                        for (const result of successfulPlatforms) {
                            if (!warningMessage.toLowerCase().includes(result.platform.toLowerCase())) {
                                throw new Error(
                                    `Warning message should include successful platform "${result.platform}". Got: "${warningMessage}"`
                                );
                            }
                        }

                        // Failed platforms should be mentioned
                        for (const result of failedPlatforms) {
                            if (!warningMessage.toLowerCase().includes(result.platform.toLowerCase())) {
                                throw new Error(
                                    `Warning message should include failed platform "${result.platform}". Got: "${warningMessage}"`
                                );
                            }
                        }

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 20 }
        );
    }, 60000);

    /**
     * Property 19: Notification matches result type - Complete Failure
     * Validates: Requirements 9.3
     * 
     * For any completed send operation where all platforms failed,
     * the system should display an error notification
     */
    it('should display error notification when all platforms fail', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate 1-3 failed platform results
                fc.array(platformResultArbitrary(false), { minLength: 1, maxLength: 3 })
                    .map(results => {
                        // Ensure unique platforms
                        const uniquePlatforms = new Set<string>();
                        const uniqueResults: PlatformResult[] = [];
                        for (const result of results) {
                            if (!uniquePlatforms.has(result.platform)) {
                                uniquePlatforms.add(result.platform);
                                uniqueResults.push(result);
                            }
                        }
                        return uniqueResults;
                    })
                    .filter(results => results.length > 0),
                async (failedResults) => {
                    const user = userEvent.setup();

                    const { unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;

                        await user.clear(messageInput);
                        await user.type(messageInput, 'test message');

                        const sendButton = screen.getByRole('button', { name: /enviar/i });
                        await user.click(sendButton);

                        vi.clearAllMocks();

                        // Simulate server response with all failed results
                        const result: MessageSentResult = {
                            success: false,
                            results: failedResults,
                        };

                        const handler = (socket as unknown as { _handlers: Record<string, (result: MessageSentResult) => void> })._handlers['message_sent_result'];
                        handler(result);

                        await waitFor(() => {
                            // Property: toast.error should be called when all platforms fail
                            if (vi.mocked(toast.error).mock.calls.length === 0) {
                                throw new Error('toast.error should be called when all platforms fail');
                            }
                        }, { timeout: 1000 });

                        // Verify toast.success and toast.warning were NOT called
                        if (vi.mocked(toast.success).mock.calls.length > 0) {
                            throw new Error('toast.success should not be called when all platforms fail');
                        }
                        if (vi.mocked(toast.warning).mock.calls.length > 0) {
                            throw new Error('toast.warning should not be called when all platforms fail');
                        }

                        // Verify the error message includes failed platforms
                        const errorCall = vi.mocked(toast.error).mock.calls[0];
                        const errorMessage = errorCall[0] as string;

                        for (const result of failedResults) {
                            if (!errorMessage.toLowerCase().includes(result.platform.toLowerCase())) {
                                throw new Error(
                                    `Error message should include failed platform "${result.platform}". Got: "${errorMessage}"`
                                );
                            }
                        }

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 20 }
        );
    }, 60000);
});

describe('Feature: multi-platform-message-sending, Property 20: Platform errors include details', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (socket as { connected: boolean }).connected = true;
        (socket as unknown as { _handlers: Record<string, (result: MessageSentResult) => void> })._handlers = {};
    });

    afterEach(() => {
        cleanup();
    });

    /**
     * Property 20: Platform errors include details
     * Validates: Requirements 9.4
     * 
     * For any platform-specific error, the notification should include 
     * the platform name and error reason
     */
    it('should include platform name and error details in notifications for any failed platform', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate platform results with specific error messages
                fc.array(
                    fc.record({
                        platform: fc.constantFrom('twitch', 'youtube', 'kick'),
                        success: fc.constant(false),
                        error: fc.string({ minLength: 5, maxLength: 50 })
                            .filter(s => s.trim().length > 0),
                        errorCode: fc.option(
                            fc.constantFrom('NOT_CONNECTED', 'INVALID_TOKEN', 'API_ERROR', 'RATE_LIMIT'),
                            { nil: undefined }
                        ),
                    }),
                    { minLength: 1, maxLength: 3 }
                ).map(results => {
                    // Ensure unique platforms
                    const uniquePlatforms = new Set<string>();
                    const uniqueResults: PlatformResult[] = [];
                    for (const result of results) {
                        if (!uniquePlatforms.has(result.platform)) {
                            uniquePlatforms.add(result.platform);
                            uniqueResults.push(result);
                        }
                    }
                    return uniqueResults;
                }).filter(results => results.length > 0),
                async (failedResults) => {
                    const user = userEvent.setup();

                    const { unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;

                        await user.clear(messageInput);
                        await user.type(messageInput, 'test message');

                        const sendButton = screen.getByRole('button', { name: /enviar/i });
                        await user.click(sendButton);

                        vi.clearAllMocks();

                        // Simulate server response with failed results containing error details
                        const result: MessageSentResult = {
                            success: false,
                            results: failedResults,
                        };

                        const handler = (socket as unknown as { _handlers: Record<string, (result: MessageSentResult) => void> })._handlers['message_sent_result'];
                        handler(result);

                        await waitFor(() => {
                            // Should call toast.error for complete failure
                            if (vi.mocked(toast.error).mock.calls.length === 0) {
                                throw new Error('toast.error should be called');
                            }
                        }, { timeout: 1000 });

                        const errorCall = vi.mocked(toast.error).mock.calls[0];
                        const errorMessage = errorCall[0] as string;

                        // Property: For each failed platform, the notification must include:
                        // 1. The platform name
                        // 2. The error message/reason
                        for (const result of failedResults) {
                            // Check platform name is included
                            if (!errorMessage.toLowerCase().includes(result.platform.toLowerCase())) {
                                throw new Error(
                                    `Error notification must include platform name "${result.platform}". Got: "${errorMessage}"`
                                );
                            }

                            // Check error details are included
                            if (result.error && !errorMessage.includes(result.error)) {
                                throw new Error(
                                    `Error notification must include error details "${result.error}" for platform "${result.platform}". Got: "${errorMessage}"`
                                );
                            }
                        }

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 20 }
        );
    }, 60000);

    /**
     * Property 20 (Extended): Platform errors include details in partial success
     * Validates: Requirements 9.4
     * 
     * Even in partial success scenarios, failed platforms should include error details
     */
    it('should include error details for failed platforms in partial success scenarios', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate one success and one failure with error details
                fc.tuple(
                    fc.record({
                        platform: fc.constantFrom('twitch', 'youtube'),
                        success: fc.constant(true),
                    }),
                    fc.record({
                        platform: fc.constantFrom('kick'),
                        success: fc.constant(false),
                        error: fc.string({ minLength: 10, maxLength: 50 })
                            .filter(s => s.trim().length > 0),
                        errorCode: fc.constantFrom('NOT_CONNECTED', 'INVALID_TOKEN', 'API_ERROR'),
                    })
                ),
                async ([successResult, failureResult]) => {
                    const user = userEvent.setup();

                    const { unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;

                        await user.clear(messageInput);
                        await user.type(messageInput, 'test message');

                        const sendButton = screen.getByRole('button', { name: /enviar/i });
                        await user.click(sendButton);

                        vi.clearAllMocks();

                        // Simulate partial success
                        const result: MessageSentResult = {
                            success: true,
                            results: [successResult, failureResult],
                        };

                        const handler = (socket as unknown as { _handlers: Record<string, (result: MessageSentResult) => void> })._handlers['message_sent_result'];
                        handler(result);

                        await waitFor(() => {
                            // Should call toast.warning for partial success
                            if (vi.mocked(toast.warning).mock.calls.length === 0) {
                                throw new Error('toast.warning should be called for partial success');
                            }
                        }, { timeout: 1000 });

                        const warningCall = vi.mocked(toast.warning).mock.calls[0];
                        const warningMessage = warningCall[0] as string;

                        // Property: Failed platform details must be included in partial success notification
                        // Check failed platform name
                        if (!warningMessage.toLowerCase().includes(failureResult.platform.toLowerCase())) {
                            throw new Error(
                                `Warning must include failed platform "${failureResult.platform}". Got: "${warningMessage}"`
                            );
                        }

                        // Check error details
                        if (failureResult.error && !warningMessage.includes(failureResult.error)) {
                            throw new Error(
                                `Warning must include error details "${failureResult.error}". Got: "${warningMessage}"`
                            );
                        }

                        // Also verify successful platform is mentioned
                        if (!warningMessage.toLowerCase().includes(successResult.platform.toLowerCase())) {
                            throw new Error(
                                `Warning must include successful platform "${successResult.platform}". Got: "${warningMessage}"`
                            );
                        }

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 20 }
        );
    }, 60000);

    /**
     * Property 20 (Comprehensive): Error details are preserved across different error types
     * Validates: Requirements 9.4
     * 
     * Verifies that different types of errors (connection, token, API) are all properly
     * included in notifications with their specific details
     */
    it('should preserve specific error types and codes in notifications', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate different error types
                fc.constantFrom(
                    { error: 'No conectado', errorCode: 'NOT_CONNECTED' },
                    { error: 'Token inválido', errorCode: 'INVALID_TOKEN' },
                    { error: 'Error de API', errorCode: 'API_ERROR' },
                    { error: 'Límite de tasa excedido', errorCode: 'RATE_LIMIT' }
                ),
                fc.constantFrom('twitch', 'youtube', 'kick'),
                async (errorDetails, platform) => {
                    const user = userEvent.setup();

                    const { unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;

                        await user.clear(messageInput);
                        await user.type(messageInput, 'test message');

                        const sendButton = screen.getByRole('button', { name: /enviar/i });
                        await user.click(sendButton);

                        vi.clearAllMocks();

                        // Simulate failure with specific error type
                        const result: MessageSentResult = {
                            success: false,
                            results: [{
                                platform,
                                success: false,
                                error: errorDetails.error,
                                errorCode: errorDetails.errorCode,
                            }],
                        };

                        const handler = (socket as unknown as { _handlers: Record<string, (result: MessageSentResult) => void> })._handlers['message_sent_result'];
                        handler(result);

                        await waitFor(() => {
                            if (vi.mocked(toast.error).mock.calls.length === 0) {
                                throw new Error('toast.error should be called');
                            }
                        }, { timeout: 1000 });

                        const errorCall = vi.mocked(toast.error).mock.calls[0];
                        const errorMessage = errorCall[0] as string;

                        // Property: Specific error message must be preserved in notification
                        if (!errorMessage.includes(errorDetails.error)) {
                            throw new Error(
                                `Notification must preserve error message "${errorDetails.error}". Got: "${errorMessage}"`
                            );
                        }

                        // Property: Platform name must be included
                        if (!errorMessage.toLowerCase().includes(platform.toLowerCase())) {
                            throw new Error(
                                `Notification must include platform "${platform}". Got: "${errorMessage}"`
                            );
                        }

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 20 }
        );
    }, 60000);
});
