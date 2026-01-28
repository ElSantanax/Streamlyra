import { describe, it, afterEach, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { render, cleanup, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ChatInput from '../index';
import { toast } from '../../../../lib/notifications/toast';
import { socket } from '../../../../services/socket';

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
 * Property-based tests for ChatInput message validation
 * Feature: multi-platform-message-sending
 */

describe('Feature: multi-platform-message-sending, Property 5: Empty messages are rejected', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    /**
     * Property 5: Empty messages are rejected
     * Validates: Requirements 2.1, 2.2
     * 
     * For any message submission where the message is empty or contains only whitespace characters,
     * the system should reject the message and prevent sending
     */
    it('should reject any message that is empty or only whitespace', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate strings that are empty or contain only whitespace
                fc.oneof(
                    fc.constant(''),
                    fc.constant(' '),
                    fc.constant('  '),
                    fc.constant('   '),
                    fc.constant('\t'),
                    fc.constant('\n'),
                    fc.constant('\r'),
                    fc.constant(' \t\n\r '),
                    fc.string().filter(s => s.trim() === '' && s.length > 0)
                ),
                async (invalidMessage) => {
                    const user = userEvent.setup();
                    
                    const { unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        // Get the message input
                        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
                        
                        // Type the invalid message
                        await user.clear(messageInput);
                        if (invalidMessage.length > 0) {
                            await user.type(messageInput, invalidMessage);
                        }

                        // Get the send button
                        const sendButton = screen.getByRole('button', { name: /enviar/i });

                        // Clear previous mock calls
                        vi.clearAllMocks();

                        // Try to send the message
                        await user.click(sendButton);

                        // Verify that an error toast was shown
                        if ((toast.error as any).mock.calls.length === 0) {
                            throw new Error(
                                `Expected error toast for invalid message "${invalidMessage}", but none was shown`
                            );
                        }

                        // Verify that the socket emit was NOT called (message was rejected)
                        if ((socket.emit as any).mock.calls.length > 0) {
                            throw new Error(
                                `Socket emit should not be called for invalid message "${invalidMessage}"`
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
    }, 30000);

    /**
     * Property 5 (Extended): Empty messages are rejected via Enter key
     * Validates: Requirements 2.1, 2.2
     */
    it('should reject empty messages when submitted via Enter key', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate whitespace-only strings
                fc.oneof(
                    fc.constant(''),
                    fc.string().filter(s => s.trim() === '')
                ),
                async (invalidMessage) => {
                    const user = userEvent.setup();
                    
                    const { unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
                        
                        await user.clear(messageInput);
                        if (invalidMessage.length > 0) {
                            await user.type(messageInput, invalidMessage);
                        }

                        vi.clearAllMocks();

                        // Submit via Enter key
                        await user.type(messageInput, '{Enter}');

                        // Verify error toast was shown
                        if ((toast.error as any).mock.calls.length === 0) {
                            throw new Error('Expected error toast when submitting empty message via Enter');
                        }

                        // Verify socket emit was not called
                        if ((socket.emit as any).mock.calls.length > 0) {
                            throw new Error('Socket emit should not be called for empty message via Enter');
                        }

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 20 }
        );
    }, 30000);
});

describe('Feature: multi-platform-message-sending, Property 6: Invalid messages are preserved in input', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    /**
     * Property 6: Invalid messages are preserved in input
     * Validates: Requirements 2.3
     * 
     * For any message that fails validation, 
     * the input field should retain the original message text
     */
    it('should preserve invalid message text in input field after rejection', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate whitespace-only strings that will fail validation
                fc.string().filter(s => s.trim() === '' && s.length > 0 && s.length < 50),
                async (invalidMessage) => {
                    const user = userEvent.setup();
                    
                    const { unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
                        
                        // Type the invalid message
                        await user.clear(messageInput);
                        await user.type(messageInput, invalidMessage);

                        // Verify the message is in the input
                        if (messageInput.value !== invalidMessage) {
                            throw new Error(
                                `Message not properly set in input. Expected "${invalidMessage}", got "${messageInput.value}"`
                            );
                        }

                        // Try to send
                        const sendButton = screen.getByRole('button', { name: /enviar/i });
                        await user.click(sendButton);

                        // Verify the message is STILL in the input (preserved)
                        if (messageInput.value !== invalidMessage) {
                            throw new Error(
                                `Invalid message should be preserved in input. Expected "${invalidMessage}", got "${messageInput.value}"`
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
    }, 30000);

    /**
     * Property 6 (Extended): Invalid messages preserved across multiple send attempts
     * Validates: Requirements 2.3
     */
    it('should preserve invalid message across multiple send attempts', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate invalid message and number of send attempts
                fc.string().filter(s => s.trim() === '' && s.length > 0 && s.length < 30),
                fc.integer({ min: 1, max: 3 }),
                async (invalidMessage, attempts) => {
                    const user = userEvent.setup();
                    
                    const { unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
                        const sendButton = screen.getByRole('button', { name: /enviar/i });
                        
                        // Type the invalid message
                        await user.clear(messageInput);
                        await user.type(messageInput, invalidMessage);

                        // Try to send multiple times
                        for (let i = 0; i < attempts; i++) {
                            await user.click(sendButton);
                            
                            // Verify message is still preserved after each attempt
                            if (messageInput.value !== invalidMessage) {
                                throw new Error(
                                    `Message should be preserved after attempt ${i + 1}. Expected "${invalidMessage}", got "${messageInput.value}"`
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
    }, 30000);
});

describe('Feature: multi-platform-message-sending, Property 7: Valid messages trigger send process', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Ensure socket is connected for these tests
        (socket as any).connected = true;
    });

    afterEach(() => {
        cleanup();
    });

    /**
     * Property 7: Valid messages trigger send process
     * Validates: Requirements 2.4
     * 
     * For any message that passes validation,
     * the system should initiate the sending process
     */
    it('should trigger send process for any valid message', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate valid messages (non-empty after trimming)
                // Filter out special characters that userEvent interprets as keyboard commands
                fc.string({ minLength: 1, maxLength: 100 })
                    .filter(s => {
                        const trimmed = s.trim();
                        // Must have content after trimming
                        if (trimmed.length === 0) return false;
                        // Avoid characters that userEvent treats as special: {, }, [, ]
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
                        const sendButton = screen.getByRole('button', { name: /enviar/i });
                        
                        // Type the valid message
                        await user.clear(messageInput);
                        await user.type(messageInput, validMessage);

                        vi.clearAllMocks();

                        // Send the message
                        await user.click(sendButton);

                        // Verify that socket emit WAS called (send process initiated)
                        if ((socket.emit as any).mock.calls.length === 0) {
                            throw new Error(
                                `Socket emit should be called for valid message "${validMessage}"`
                            );
                        }

                        // Verify the emit was called with 'send_message' event
                        const emitCalls = (socket.emit as any).mock.calls;
                        const sendMessageCall = emitCalls.find((call: any[]) => call[0] === 'send_message');
                        
                        if (!sendMessageCall) {
                            throw new Error(
                                `Expected 'send_message' event to be emitted for valid message "${validMessage}"`
                            );
                        }

                        // Verify the payload contains the trimmed message
                        const payload = sendMessageCall[1];
                        if (payload.message !== validMessage.trim()) {
                            throw new Error(
                                `Expected payload message to be "${validMessage.trim()}", got "${payload.message}"`
                            );
                        }

                        // Verify no error toast was shown
                        if ((toast.error as any).mock.calls.length > 0) {
                            throw new Error(
                                `Error toast should not be shown for valid message "${validMessage}"`
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
    }, 30000);

    /**
     * Property 7 (Extended): Valid messages with leading/trailing whitespace trigger send
     * Validates: Requirements 2.4
     */
    it('should trigger send process for messages with leading/trailing whitespace', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate valid core message (avoid special characters)
                fc.string({ minLength: 1, maxLength: 50 })
                    .filter(s => {
                        const trimmed = s.trim();
                        if (trimmed.length === 0) return false;
                        // Avoid special characters that userEvent interprets
                        if (s.includes('{') || s.includes('}') || s.includes('[') || s.includes(']')) return false;
                        return true;
                    }),
                // Generate leading whitespace
                fc.oneof(
                    fc.constant(''),
                    fc.constant(' '),
                    fc.constant('  ')
                ),
                // Generate trailing whitespace
                fc.oneof(
                    fc.constant(''),
                    fc.constant(' '),
                    fc.constant('  ')
                ),
                async (coreMessage, leadingWs, trailingWs) => {
                    const fullMessage = leadingWs + coreMessage + trailingWs;
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
                        await user.type(messageInput, fullMessage);

                        vi.clearAllMocks();

                        await user.click(sendButton);

                        // Verify socket emit was called
                        if ((socket.emit as any).mock.calls.length === 0) {
                            throw new Error(
                                `Socket emit should be called for message with whitespace "${fullMessage}"`
                            );
                        }

                        // Verify the payload contains the TRIMMED message
                        const emitCalls = (socket.emit as any).mock.calls;
                        const sendMessageCall = emitCalls.find((call: any[]) => call[0] === 'send_message');
                        const payload = sendMessageCall[1];
                        
                        if (payload.message !== fullMessage.trim()) {
                            throw new Error(
                                `Expected trimmed message "${fullMessage.trim()}", got "${payload.message}"`
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
    }, 30000);

    /**
     * Property 7 (Comprehensive): Valid messages trigger send via Enter key
     * Validates: Requirements 2.4
     */
    it('should trigger send process when valid message submitted via Enter', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate valid messages (avoid special characters and newlines)
                fc.string({ minLength: 1, maxLength: 100 })
                    .filter(s => {
                        const trimmed = s.trim();
                        if (trimmed.length === 0) return false;
                        // Exclude newlines for Enter key test and special characters
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

                        // Verify socket emit was called
                        if ((socket.emit as any).mock.calls.length === 0) {
                            throw new Error(
                                `Socket emit should be called when submitting valid message via Enter: "${validMessage}"`
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
    }, 30000);
});
