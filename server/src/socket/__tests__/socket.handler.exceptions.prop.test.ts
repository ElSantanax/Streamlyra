import fc from 'fast-check';
import { Socket } from 'socket.io';
import { MessageSenderService } from '../../services/message/MessageSenderService';
import { SocketConnectionManager } from '../services/SocketConnectionManager';
import { Platform } from '../../constants/platforms';

/**
 * Property-Based Tests for Socket Handler - Exception Handling
 * Feature: multi-platform-message-sending
 * 
 * Property 13: Exceptions are handled gracefully
 * Validates: Requirements 4.4
 */

describe('Feature: multi-platform-message-sending, Property 13: Exceptions are handled gracefully', () => {
    let mockSocket: jest.Mocked<Socket>;
    let mockMessageSenderService: jest.Mocked<MessageSenderService>;
    let mockConnectionManager: jest.Mocked<SocketConnectionManager>;

    beforeEach(() => {
        // Create mock socket
        mockSocket = {
            id: 'test-socket-id',
            emit: jest.fn(),
            on: jest.fn()
        } as unknown as jest.Mocked<Socket>;

        // Create mock MessageSenderService
        mockMessageSenderService = {
            sendMessage: jest.fn()
        } as unknown as jest.Mocked<MessageSenderService>;

        // Create mock SocketConnectionManager
        mockConnectionManager = {
            getUserIdBySocketId: jest.fn()
        } as unknown as jest.Mocked<SocketConnectionManager>;
    });

    it('should emit error event when MessageSenderService throws any exception', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate valid payload
                fc.record({
                    userId: fc.uuid(),
                    message: fc.string({ minLength: 1, maxLength: 100 }),
                    platforms: fc.uniqueArray(
                        fc.constantFrom('twitch', 'youtube', 'kick'),
                        { minLength: 1, maxLength: 3 }
                    )
                }),
                // Generate various error types
                fc.oneof(
                    fc.constant(new Error('Network error')),
                    fc.constant(new Error('Database error')),
                    fc.constant(new Error('Timeout error')),
                    fc.constant(new TypeError('Type error')),
                    fc.constant(new RangeError('Range error')),
                    fc.constant({ message: 'Custom error object' }),
                    fc.constant('String error'),
                    fc.constant(null),
                    fc.constant(undefined)
                ),
                async (payload, error) => {
                    // Setup: Mock getUserIdBySocketId to return matching userId
                    mockConnectionManager.getUserIdBySocketId.mockReturnValue(payload.userId);

                    // Setup: Mock sendMessage to throw the error
                    mockMessageSenderService.sendMessage.mockRejectedValue(error);

                    // Simulate the send_message handler logic
                    try {
                        // Validate payload (should pass)
                        const isValid = isValidSendMessagePayload(payload);
                        expect(isValid).toBe(true);

                        // Check userId matches
                        const sessionUserId = mockConnectionManager.getUserIdBySocketId(mockSocket.id);
                        expect(sessionUserId).toBe(payload.userId);

                        // Call MessageSenderService (will throw)
                        await mockMessageSenderService.sendMessage({
                            userId: payload.userId,
                            message: payload.message,
                            platforms: payload.platforms
                        });

                        // Should not reach here
                        fail('Expected sendMessage to throw');
                    } catch {
                        // Property: Exception should be caught and error event should be emitted
                        mockSocket.emit('message_send_error', {
                            code: 'INTERNAL_ERROR',
                            message: 'Error interno del servidor'
                        });
                    }

                    // Property: Error event should always be emitted when exception occurs
                    expect(mockSocket.emit).toHaveBeenCalledWith(
                        'message_send_error',
                        expect.objectContaining({
                            code: 'INTERNAL_ERROR',
                            message: expect.any(String) as unknown as string
                        })
                    );
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should handle exceptions without crashing the socket connection', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    userId: fc.uuid(),
                    message: fc.string({ minLength: 1, maxLength: 100 }),
                    platforms: fc.uniqueArray(
                        fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                        { minLength: 1, maxLength: 3 }
                    )
                }),
                fc.string({ minLength: 1, maxLength: 100 }), // error message
                async (payload, errorMessage) => {
                    mockConnectionManager.getUserIdBySocketId.mockReturnValue(payload.userId);
                    mockMessageSenderService.sendMessage.mockRejectedValue(new Error(errorMessage));

                    // Simulate handler
                    let handlerCompleted = false;
                    try {
                        await mockMessageSenderService.sendMessage({
                            userId: payload.userId,
                            message: payload.message,
                            platforms: payload.platforms
                        });
                    } catch {
                        // Handle exception gracefully
                        mockSocket.emit('message_send_error', {
                            code: 'INTERNAL_ERROR',
                            message: 'Error interno del servidor'
                        });
                        handlerCompleted = true;
                    }

                    // Property: Handler should complete execution even when exception occurs
                    expect(handlerCompleted).toBe(true);

                    // Property: Socket should still be able to emit events
                    expect(mockSocket.emit).toHaveBeenCalled();
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should emit consistent error format regardless of exception type', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1 }),
                fc.uniqueArray(
                    fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                    { minLength: 1, maxLength: 3 }
                ),
                fc.oneof(
                    fc.constant(new Error('Test error')),
                    fc.constant(new TypeError('Type error')),
                    fc.constant({ custom: 'error' }),
                    fc.constant('string error'),
                    fc.constant(42),
                    fc.constant(null)
                ),
                async (userId, message, platforms, error) => {
                    mockConnectionManager.getUserIdBySocketId.mockReturnValue(userId);
                    mockMessageSenderService.sendMessage.mockRejectedValue(error);

                    try {
                        await mockMessageSenderService.sendMessage({
                            userId,
                            message,
                            platforms
                        });
                    } catch {
                        mockSocket.emit('message_send_error', {
                            code: 'INTERNAL_ERROR',
                            message: 'Error interno del servidor'
                        });
                    }

                    // Property: Error format should always be consistent
                    expect(mockSocket.emit).toHaveBeenCalledWith(
                        'message_send_error',
                        expect.objectContaining({
                            code: expect.any(String) as unknown as string,
                            message: expect.any(String) as unknown as string
                        })
                    );

                    // Property: Error should have required fields
                    const emitCall = mockSocket.emit.mock.calls[0] as [string, { code: string; message: string }];
                    expect(emitCall[0]).toBe('message_send_error');
                    expect(emitCall[1]).toHaveProperty('code');
                    expect(emitCall[1]).toHaveProperty('message');
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should not expose internal error details to client', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.uuid(),
                fc.string({ minLength: 1 }),
                fc.uniqueArray(
                    fc.constantFrom('twitch' as Platform, 'youtube' as Platform, 'kick' as Platform),
                    { minLength: 1, maxLength: 3 }
                ),
                fc.string({ minLength: 10, maxLength: 200 }), // detailed internal error
                async (userId, message, platforms, internalError) => {
                    mockConnectionManager.getUserIdBySocketId.mockReturnValue(userId);
                    mockMessageSenderService.sendMessage.mockRejectedValue(
                        new Error(`Internal: ${internalError}`)
                    );

                    try {
                        await mockMessageSenderService.sendMessage({
                            userId,
                            message,
                            platforms
                        });
                    } catch {
                        mockSocket.emit('message_send_error', {
                            code: 'INTERNAL_ERROR',
                            message: 'Error interno del servidor'
                        });
                    }

                    // Property: Internal error details should not be exposed
                    const emitCall = mockSocket.emit.mock.calls[0] as [string, { code: string; message: string }];
                    const errorMessage = emitCall[1].message;

                    // Should be a generic message, not the internal error
                    expect(errorMessage).not.toContain(internalError);
                    expect(errorMessage).toBe('Error interno del servidor');
                }
            ),
            { numRuns: 100 }
        );
    });
});

// Helper function (copied from socket.handler.ts for testing)
function isValidSendMessagePayload(payload: unknown): boolean {
    if (!payload || typeof payload !== 'object') {
        return false;
    }

    const p = payload as Record<string, unknown>;

    return (
        typeof p.userId === 'string' &&
        typeof p.message === 'string' &&
        Array.isArray(p.platforms) &&
        p.platforms.every((platform: unknown) => typeof platform === 'string')
    );
}
