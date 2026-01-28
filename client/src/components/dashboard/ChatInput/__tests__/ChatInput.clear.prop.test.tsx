import { describe, it, afterEach, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { render, cleanup, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ChatInput from '../index';
import { toast } from '../../../../lib/notifications/toast';
import { socket } from '../../../../services/socket';
import type { MessageSentResult } from '../../../../types/message.types';

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
 * Property-based tests for ChatInput input clearing behavior
 * Feature: multi-platform-message-sending
 */

describe('Feature: multi-platform-message-sending, Property 9: Successful send clears input', () => {
    let messageResultHandler: ((result: MessageSentResult) => void) | null = null;

    beforeEach(() => {
        vi.clearAllMocks();
        messageResultHandler = null;
        
        // Ensure socket is connected
        (socket as any).connected = true;
        
        // Capture the message_sent_result handler when socket.on is called
        (socket.on as any).mockImplementation((event: string, handler: any) => {
            if (event === 'message_sent_result') {
                messageResultHandler = handler;
            }
        });
    });

    afterEach(() => {
        cleanup();
        messageResultHandler = null;
    });

    /**
     * Property 9: Successful send clears input
     * Validates: Requirements 3.3
     * 
     * For any successful message send operation (all platforms succeed),
     * the input field should be cleared
     */
    it('should clear input field when all platforms succeed', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate valid messages (avoid special characters)
                fc.string({ minLength: 1, maxLength: 100 })
                    .filter(s => {
                        const trimmed = s.trim();
                        if (trimmed.length === 0) return false;
                        // Avoid special characters that userEvent interprets
                        if (s.includes('{') || s.includes('}') || s.includes('[') || s.includes(']')) return false;
                        return true;
                    }),
                // Generate list of successful platforms (at least one)
                fc.array(
                    fc.constantFrom('twitch', 'youtube', 'kick'),
                    { minLength: 1, maxLength: 3 }
                ).map(arr => [...new Set(arr)]), // Remove duplicates
                async (validMessage, platforms) => {
                    const user = userEvent.setup();
                    
                    const { unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
                        const sendButton = screen.getByRole('button', { name: /enviar/i });
                        
                        // Type the valid message
                        await user.clear(messageInput);
                        await user.type(messageInput, validMessage);

                        // Verify message is in input
                        if (messageInput.value !== validMessage) {
                            throw new Error(
                                `Message not set correctly. Expected "${validMessage}", got "${messageInput.value}"`
                            );
                        }

                        // Send the message
                        await user.click(sendButton);

                        // Simulate successful response from server (all platforms succeed)
                        const successResult: MessageSentResult = {
                            success: true,
                            results: platforms.map(platform => ({
                                platform,
                                success: true
                            }))
                        };

                        // Trigger the message_sent_result handler
                        if (!messageResultHandler) {
                            throw new Error('message_sent_result handler was not registered');
                        }

                        messageResultHandler(successResult);

                        // Wait for state update and verify input is cleared
                        await waitFor(() => {
                            if (messageInput.value !== '') {
                                throw new Error(
                                    `Input should be cleared after successful send. Expected "", got "${messageInput.value}"`
                                );
                            }
                        }, { timeout: 1000 });

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 100 }
        );
    }, 30000);

    /**
     * Property 9 (Extended): Partial success also clears input
     * Validates: Requirements 3.3
     * 
     * For any message send operation where at least one platform succeeds,
     * the input field should be cleared (partial success)
     */
    it('should clear input field when some platforms succeed (partial success)', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate valid messages
                fc.string({ minLength: 1, maxLength: 100 })
                    .filter(s => {
                        const trimmed = s.trim();
                        if (trimmed.length === 0) return false;
                        if (s.includes('{') || s.includes('}') || s.includes('[') || s.includes(']')) return false;
                        return true;
                    }),
                // Generate at least 2 platforms so we can have partial success
                fc.array(
                    fc.constantFrom('twitch', 'youtube', 'kick'),
                    { minLength: 2, maxLength: 3 }
                ).map(arr => [...new Set(arr)]),
                async (validMessage, platforms) => {
                    // Skip if we don't have at least 2 platforms
                    if (platforms.length < 2) return true;

                    const user = userEvent.setup();
                    
                    const { unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
                        const sendButton = screen.getByRole('button', { name: /enviar/i });
                        
                        await user.clear(messageInput);
                        await user.type(messageInput, validMessage);

                        await user.click(sendButton);

                        // Simulate partial success: first platform succeeds, rest fail
                        const partialSuccessResult: MessageSentResult = {
                            success: true, // At least one succeeded
                            results: platforms.map((platform, index) => ({
                                platform,
                                success: index === 0, // Only first succeeds
                                error: index === 0 ? undefined : 'Test error'
                            }))
                        };

                        if (!messageResultHandler) {
                            throw new Error('message_sent_result handler was not registered');
                        }

                        messageResultHandler(partialSuccessResult);

                        // Wait for state update and verify input is cleared
                        await waitFor(() => {
                            if (messageInput.value !== '') {
                                throw new Error(
                                    `Input should be cleared after partial success. Expected "", got "${messageInput.value}"`
                                );
                            }
                        }, { timeout: 1000 });

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
     * Property 9 (Inverse): Complete failure does NOT clear input
     * Validates: Requirements 3.3 (inverse case)
     * 
     * For any message send operation where all platforms fail,
     * the input field should NOT be cleared (so user can retry)
     */
    it('should NOT clear input field when all platforms fail', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate valid messages
                fc.string({ minLength: 1, maxLength: 100 })
                    .filter(s => {
                        const trimmed = s.trim();
                        if (trimmed.length === 0) return false;
                        if (s.includes('{') || s.includes('}') || s.includes('[') || s.includes(']')) return false;
                        return true;
                    }),
                // Generate list of platforms
                fc.array(
                    fc.constantFrom('twitch', 'youtube', 'kick'),
                    { minLength: 1, maxLength: 3 }
                ).map(arr => [...new Set(arr)]),
                async (validMessage, platforms) => {
                    const user = userEvent.setup();
                    
                    const { unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
                        const sendButton = screen.getByRole('button', { name: /enviar/i });
                        
                        await user.clear(messageInput);
                        await user.type(messageInput, validMessage);

                        await user.click(sendButton);

                        // Simulate complete failure: all platforms fail
                        const failureResult: MessageSentResult = {
                            success: false, // All failed
                            results: platforms.map(platform => ({
                                platform,
                                success: false,
                                error: 'Test error'
                            }))
                        };

                        if (!messageResultHandler) {
                            throw new Error('message_sent_result handler was not registered');
                        }

                        messageResultHandler(failureResult);

                        // Wait a bit and verify input is NOT cleared
                        await waitFor(() => {
                            if (messageInput.value !== validMessage) {
                                throw new Error(
                                    `Input should NOT be cleared after complete failure. Expected "${validMessage}", got "${messageInput.value}"`
                                );
                            }
                        }, { timeout: 1000 });

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
     * Property 9 (Comprehensive): Input clearing is consistent across multiple sends
     * Validates: Requirements 3.3
     * 
     * Verifies that the input clearing behavior is consistent across multiple
     * successful send operations
     */
    it('should consistently clear input across multiple successful sends', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate array of valid messages
                fc.array(
                    fc.string({ minLength: 1, maxLength: 50 })
                        .filter(s => {
                            const trimmed = s.trim();
                            if (trimmed.length === 0) return false;
                            if (s.includes('{') || s.includes('}') || s.includes('[') || s.includes(']')) return false;
                            return true;
                        }),
                    { minLength: 1, maxLength: 3 }
                ),
                async (messages) => {
                    const user = userEvent.setup();
                    
                    const { unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
                        const sendButton = screen.getByRole('button', { name: /enviar/i });

                        // Send each message and verify clearing
                        for (const message of messages) {
                            // Type message
                            await user.clear(messageInput);
                            await user.type(messageInput, message);

                            // Send
                            await user.click(sendButton);

                            // Simulate success
                            const successResult: MessageSentResult = {
                                success: true,
                                results: [{ platform: 'twitch', success: true }]
                            };

                            if (!messageResultHandler) {
                                throw new Error('message_sent_result handler was not registered');
                            }

                            messageResultHandler(successResult);

                            // Verify cleared
                            await waitFor(() => {
                                if (messageInput.value !== '') {
                                    throw new Error(
                                        `Input should be cleared after send ${messages.indexOf(message) + 1}. Expected "", got "${messageInput.value}"`
                                    );
                                }
                            }, { timeout: 1000 });
                        }

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 30 }
        );
    }, 30000);
});
