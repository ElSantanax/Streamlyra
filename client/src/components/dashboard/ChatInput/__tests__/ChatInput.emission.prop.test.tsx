import { describe, it, afterEach, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { render, cleanup, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ChatInput from '../index';
import { socket } from '../../../../services/socket';
import type { SendMessagePayload } from '../../../../types/message.types';

// Mock dependencies
vi.mock('../../../../lib/notifications/toast', () => ({
    toast: {
        error: vi.fn(),
        warning: vi.fn(),
        success: vi.fn(),
    }
}));

vi.mock('../../../../services/socket', () => ({
    socket: {
        connected: true,
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    }
}));

vi.mock('../../../../hooks/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'test-user-id', username: 'testuser' },
        isAuthenticated: true,
    })
}));

/**
 * Property-based tests for ChatInput socket event emission and send button state
 * Feature: multi-platform-message-sending
 */

describe('Feature: multi-platform-message-sending, Property 8: Socket event emission includes required data', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Ensure socket is connected for these tests
        (socket as any).connected = true;
    });

    afterEach(() => {
        cleanup();
    });

    /**
     * Property 8: Socket event emission includes required data
     * Validates: Requirements 3.1, 3.2
     * 
     * For any valid message submission, the emitted Socket.IO "send_message" event 
     * should contain userId, message text, and selected platforms array
     */
    it('should emit send_message event with userId, message, and platforms for any valid message', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate valid messages (avoid special characters that userEvent interprets)
                fc.string({ minLength: 1, maxLength: 100 })
                    .filter(s => {
                        const trimmed = s.trim();
                        if (trimmed.length === 0) return false;
                        // Avoid characters that userEvent treats as special
                        if (s.includes('{') || s.includes('}') || s.includes('[') || s.includes(']')) return false;
                        return true;
                    }),
                // Generate platform selection (at least one ENABLED platform must be selected)
                // Note: Kick is disabled, so we only consider twitch and youtube
                fc.record({
                    twitch: fc.boolean(),
                    youtube: fc.boolean(),
                }).filter(platforms => platforms.twitch || platforms.youtube),
                async (validMessage, platformSelection) => {
                    const user = userEvent.setup();
                    
                    const { unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
                        
                        // Set platform toggles according to generated selection
                        // Only toggle enabled platforms (twitch and youtube)
                        if (!platformSelection.twitch) {
                            const twitchToggle = screen.getByLabelText('Twitch');
                            await user.click(twitchToggle);
                        }
                        if (!platformSelection.youtube) {
                            const youtubeToggle = screen.getByLabelText('YouTube');
                            await user.click(youtubeToggle);
                        }
                        // Kick is disabled, so we don't try to toggle it

                        // Type the valid message
                        await user.clear(messageInput);
                        await user.type(messageInput, validMessage);

                        vi.clearAllMocks();

                        // Send the message
                        const sendButton = screen.getByRole('button', { name: /enviar/i });
                        await user.click(sendButton);

                        // Verify socket.emit was called
                        if ((socket.emit as any).mock.calls.length === 0) {
                            throw new Error('Socket emit should be called for valid message');
                        }

                        // Find the send_message event call
                        const emitCalls = (socket.emit as any).mock.calls;
                        const sendMessageCall = emitCalls.find((call: any[]) => call[0] === 'send_message');
                        
                        if (!sendMessageCall) {
                            throw new Error('Expected send_message event to be emitted');
                        }

                        // Verify the payload structure and content
                        const payload = sendMessageCall[1] as SendMessagePayload;

                        // Property: userId must be present and be a string
                        if (typeof payload.userId !== 'string' || payload.userId.length === 0) {
                            throw new Error(
                                `Payload must contain userId as non-empty string, got: ${typeof payload.userId}`
                            );
                        }

                        // Property: message must be present and match the trimmed input
                        if (typeof payload.message !== 'string') {
                            throw new Error(
                                `Payload must contain message as string, got: ${typeof payload.message}`
                            );
                        }
                        if (payload.message !== validMessage.trim()) {
                            throw new Error(
                                `Payload message should be trimmed. Expected "${validMessage.trim()}", got "${payload.message}"`
                            );
                        }

                        // Property: platforms must be present and be an array
                        if (!Array.isArray(payload.platforms)) {
                            throw new Error(
                                `Payload must contain platforms as array, got: ${typeof payload.platforms}`
                            );
                        }

                        // Property: platforms array must contain only selected platforms
                        const expectedPlatforms: string[] = [];
                        if (platformSelection.twitch) expectedPlatforms.push('twitch');
                        if (platformSelection.youtube) expectedPlatforms.push('youtube');
                        // Kick is disabled, so it's never included in expected platforms

                        // Sort both arrays for comparison
                        const sortedPayloadPlatforms = [...payload.platforms].sort();
                        const sortedExpectedPlatforms = [...expectedPlatforms].sort();

                        if (JSON.stringify(sortedPayloadPlatforms) !== JSON.stringify(sortedExpectedPlatforms)) {
                            throw new Error(
                                `Payload platforms should match selection. Expected ${JSON.stringify(sortedExpectedPlatforms)}, got ${JSON.stringify(sortedPayloadPlatforms)}`
                            );
                        }

                        // Property: platforms array must not contain 'tiktok'
                        if (payload.platforms.includes('tiktok')) {
                            throw new Error('Payload platforms must never include tiktok');
                        }

                        // Property: platforms array must not be empty (we filtered for this)
                        if (payload.platforms.length === 0) {
                            throw new Error('Payload platforms array must not be empty when platforms are selected');
                        }

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 100 }
        );
    }, 60000);

    /**
     * Property 8 (Extended): Socket event emission via Enter key includes required data
     * Validates: Requirements 3.1, 3.2
     */
    it('should emit send_message with required data when submitted via Enter key', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate valid messages (avoid newlines and special characters)
                fc.string({ minLength: 1, maxLength: 50 })
                    .filter(s => {
                        const trimmed = s.trim();
                        if (trimmed.length === 0) return false;
                        if (s.includes('\n') || s.includes('{') || s.includes('}') || s.includes('[') || s.includes(']')) return false;
                        return true;
                    }),
                async (validMessage) => {
                    const user = userEvent.setup();
                    
                    const { unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
                        
                        await user.clear(messageInput);
                        await user.type(messageInput, validMessage);

                        vi.clearAllMocks();

                        // Submit via Enter key
                        await user.type(messageInput, '{Enter}');

                        // Verify socket.emit was called with required data
                        const emitCalls = (socket.emit as any).mock.calls;
                        const sendMessageCall = emitCalls.find((call: any[]) => call[0] === 'send_message');
                        
                        if (!sendMessageCall) {
                            throw new Error('Expected send_message event via Enter key');
                        }

                        const payload = sendMessageCall[1] as SendMessagePayload;

                        // Verify all required fields are present
                        if (!payload.userId || !payload.message || !payload.platforms) {
                            throw new Error(
                                `Payload must contain userId, message, and platforms. Got: ${JSON.stringify(payload)}`
                            );
                        }

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 50 }
        );
    }, 30000);

    /**
     * Property 8 (Comprehensive): Socket event emission with all platform combinations
     * Validates: Requirements 3.1, 3.2
     */
    it('should emit correct platforms array for any valid platform combination', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate a simple valid message
                fc.constant('test message'),
                // Generate all possible platform combinations (at least one ENABLED platform selected)
                // Note: Kick is disabled, so we only consider twitch and youtube
                fc.record({
                    twitch: fc.boolean(),
                    youtube: fc.boolean(),
                }).filter(platforms => platforms.twitch || platforms.youtube),
                async (message, platformSelection) => {
                    const user = userEvent.setup();
                    
                    const { unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        // Configure platform toggles
                        // Default state is twitch: true, youtube: true, kick: false (disabled)
                        // We need to adjust to match platformSelection
                        
                        if (!platformSelection.twitch) {
                            const twitchToggle = screen.getByLabelText('Twitch');
                            await user.click(twitchToggle);
                        }
                        if (!platformSelection.youtube) {
                            const youtubeToggle = screen.getByLabelText('YouTube');
                            await user.click(youtubeToggle);
                        }
                        // Kick is disabled, so we don't try to toggle it

                        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
                        await user.clear(messageInput);
                        await user.type(messageInput, message);

                        vi.clearAllMocks();

                        const sendButton = screen.getByRole('button', { name: /enviar/i });
                        await user.click(sendButton);

                        const emitCalls = (socket.emit as any).mock.calls;
                        const sendMessageCall = emitCalls.find((call: any[]) => call[0] === 'send_message');
                        const payload = sendMessageCall[1] as SendMessagePayload;

                        // Build expected platforms array (only enabled platforms)
                        const expectedPlatforms: string[] = [];
                        if (platformSelection.twitch) expectedPlatforms.push('twitch');
                        if (platformSelection.youtube) expectedPlatforms.push('youtube');
                        // Kick is disabled, so it's never included

                        // Verify platforms match exactly (order-independent)
                        const sortedPayload = [...payload.platforms].sort();
                        const sortedExpected = [...expectedPlatforms].sort();

                        if (JSON.stringify(sortedPayload) !== JSON.stringify(sortedExpected)) {
                            throw new Error(
                                `Platform mismatch. Expected ${JSON.stringify(sortedExpected)}, got ${JSON.stringify(sortedPayload)}`
                            );
                        }

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 100 }
        );
    }, 60000);
});

describe('Feature: multi-platform-message-sending, Property 10: Send button is disabled during operation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (socket as any).connected = true;
    });

    afterEach(() => {
        cleanup();
    });

    /**
     * Property 10: Send button is disabled during operation
     * Validates: Requirements 3.5
     * 
     * For any message send operation in progress, the send button should be 
     * disabled to prevent duplicate submissions
     */
    it('should disable send button immediately after clicking for any valid message', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate valid messages
                fc.string({ minLength: 1, maxLength: 50 })
                    .filter(s => {
                        const trimmed = s.trim();
                        if (trimmed.length === 0) return false;
                        if (s.includes('{') || s.includes('}') || s.includes('[') || s.includes(']')) return false;
                        return true;
                    }),
                async (validMessage) => {
                    const user = userEvent.setup();
                    
                    const { unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
                        const sendButton = screen.getByRole('button', { name: /enviar/i }) as HTMLButtonElement;
                        
                        // Verify button is initially enabled
                        if (sendButton.disabled) {
                            throw new Error('Send button should be enabled initially');
                        }

                        await user.clear(messageInput);
                        await user.type(messageInput, validMessage);

                        // Click send button
                        await user.click(sendButton);

                        // Property: Button should be disabled immediately after send
                        // We need to check this synchronously after the click
                        await waitFor(() => {
                            if (!sendButton.disabled) {
                                throw new Error(
                                    `Send button should be disabled during send operation for message "${validMessage}"`
                                );
                            }
                        }, { timeout: 100 });

                        // Property: Input should also be disabled during send
                        if (!messageInput.disabled) {
                            throw new Error('Message input should be disabled during send operation');
                        }

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 100 }
        );
    }, 60000);

    /**
     * Property 10 (Extended): Send button disabled prevents Enter key submission
     * Validates: Requirements 3.5
     */
    it('should prevent Enter key submission when send operation is in progress', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate valid message
                fc.string({ minLength: 1, maxLength: 30 })
                    .filter(s => {
                        const trimmed = s.trim();
                        if (trimmed.length === 0) return false;
                        if (s.includes('\n') || s.includes('{') || s.includes('}') || s.includes('[') || s.includes(']')) return false;
                        return true;
                    }),
                async (validMessage) => {
                    const user = userEvent.setup();
                    
                    const { unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
                        
                        await user.clear(messageInput);
                        await user.type(messageInput, validMessage);

                        vi.clearAllMocks();

                        // Submit via Enter key
                        await user.type(messageInput, '{Enter}');

                        // Verify first emit happened
                        const firstEmitCount = (socket.emit as any).mock.calls.length;
                        if (firstEmitCount === 0) {
                            throw new Error('First emit should have occurred');
                        }

                        // Try to submit again via Enter while isSending is true
                        await user.type(messageInput, '{Enter}');

                        // Verify no additional emit occurred (button/input disabled)
                        const secondEmitCount = (socket.emit as any).mock.calls.length;
                        if (secondEmitCount > firstEmitCount) {
                            throw new Error(
                                `Duplicate submission should be prevented. First: ${firstEmitCount}, Second: ${secondEmitCount}`
                            );
                        }

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 50 }
        );
    }, 30000);

    /**
     * Property 10 (Comprehensive): Multiple rapid clicks are prevented
     * Validates: Requirements 3.5
     */
    it('should prevent multiple rapid button clicks during send operation', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate valid message
                fc.constant('test message'),
                // Generate number of rapid clicks to attempt
                fc.integer({ min: 2, max: 5 }),
                async (message, clickAttempts) => {
                    const user = userEvent.setup();
                    
                    const { unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
                        const sendButton = screen.getByRole('button', { name: /enviar/i }) as HTMLButtonElement;
                        
                        await user.clear(messageInput);
                        await user.type(messageInput, message);

                        vi.clearAllMocks();

                        // Attempt multiple rapid clicks
                        for (let i = 0; i < clickAttempts; i++) {
                            await user.click(sendButton);
                        }

                        // Property: Only ONE emit should have occurred despite multiple clicks
                        const emitCalls = (socket.emit as any).mock.calls;
                        const sendMessageCalls = emitCalls.filter((call: any[]) => call[0] === 'send_message');
                        
                        if (sendMessageCalls.length !== 1) {
                            throw new Error(
                                `Expected exactly 1 send_message emit despite ${clickAttempts} clicks, got ${sendMessageCalls.length}`
                            );
                        }

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 50 }
        );
    }, 30000);
});
