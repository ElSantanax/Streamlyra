/**
 * Integration tests for ChatInput component - Complete flow testing
 * Feature: multi-platform-message-sending
 * 
 * Tests the complete user flow from writing a message to receiving confirmation
 * Requirements: 1.1, 2.1, 3.1, 4.3, 9.1, 9.2, 10.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ChatInput from '../index';
import { toast } from '../../../../lib/notifications/toast';
import { socket } from '../../../../services/socket';
import type { MessageSentResult, SendMessagePayload } from '../../../../types/message.types';

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
        on: vi.fn((event: string, handler: Function) => {
            // Store handlers for manual triggering in tests
            (socket as any)._handlers = (socket as any)._handlers || {};
            (socket as any)._handlers[event] = handler;
        }),
        off: vi.fn(),
    }
}));

vi.mock('../../../../hooks/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'test-user-123', username: 'teststreamer' },
        isAuthenticated: true,
    })
}));

describe('ChatInput Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (socket as any).connected = true;
        (socket as any)._handlers = {};
    });

    afterEach(() => {
        cleanup();
    });

    /**
     * Test: Usuario escribe mensaje, selecciona plataformas, envía, recibe confirmación
     * Requirements: 1.1, 3.1, 9.1
     * 
     * This test validates the complete happy path:
     * 1. User types a message
     * 2. User selects platforms (default: twitch and youtube)
     * 3. User clicks send button
     * 4. System emits socket event with correct payload
     * 5. Server responds with success
     * 6. User sees success notification
     * 7. Input is cleared
     */
    it('should complete full flow: write message, select platforms, send, receive confirmation', async () => {
        const user = userEvent.setup();

        // Step 1: Verify initial state - platforms are selected by default
        const { container } = render(
            <MemoryRouter>
                <ChatInput />
            </MemoryRouter>
        );

        const twitchToggle = container.querySelector('input#toggle-twitch') as HTMLInputElement;
        const youtubeToggle = container.querySelector('input#toggle-youtube') as HTMLInputElement;
        
        expect(twitchToggle.checked).toBe(true);
        expect(youtubeToggle.checked).toBe(true);

        // Step 2: User types a message
        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
        const testMessage = 'Hello everyone! Thanks for watching my stream!';
        
        await user.type(messageInput, testMessage);
        expect(messageInput.value).toBe(testMessage);

        // Step 3: User clicks send button
        const sendButton = screen.getByRole('button', { name: /enviar/i });
        await user.click(sendButton);

        // Step 4: Verify socket event was emitted with correct payload
        expect(socket.emit).toHaveBeenCalledTimes(1);
        expect(socket.emit).toHaveBeenCalledWith('send_message', {
            userId: 'test-user-123',
            message: testMessage,
            platforms: ['twitch', 'youtube']
        });

        // Step 5: Verify send button is disabled during operation
        expect(sendButton).toBeDisabled();

        // Step 6: Simulate server response with success
        const successResult: MessageSentResult = {
            success: true,
            results: [
                { platform: 'twitch', success: true },
                { platform: 'youtube', success: true }
            ]
        };

        const handler = (socket as any)._handlers['message_sent_result'];
        expect(handler).toBeDefined();
        handler(successResult);

        // Step 7: Verify success notification is displayed
        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledTimes(1);
            expect(toast.success).toHaveBeenCalledWith(
                expect.stringContaining('twitch')
            );
            expect(toast.success).toHaveBeenCalledWith(
                expect.stringContaining('youtube')
            );
        });

        // Step 8: Verify input is cleared after successful send
        expect(messageInput.value).toBe('');

        // Step 9: Verify send button is re-enabled
        expect(sendButton).not.toBeDisabled();
    });

    /**
     * Test: Usuario intenta enviar sin plataformas seleccionadas
     * Requirements: 2.1, 3.1
     * 
     * This test validates that the system prevents sending when no platforms are selected:
     * 1. User unchecks all platforms
     * 2. User types a message
     * 3. User clicks send
     * 4. System shows warning notification
     * 5. No socket event is emitted
     * 6. Message remains in input
     */
    it('should prevent sending when no platforms are selected', async () => {
        const user = userEvent.setup();

        const { container } = render(
            <MemoryRouter>
                <ChatInput />
            </MemoryRouter>
        );

        // Step 1: Uncheck all platforms using "Todos" toggle
        const todosToggle = container.querySelector('input#toggle-all') as HTMLInputElement;
        expect(todosToggle.checked).toBe(true);
        
        await user.click(todosToggle);
        expect(todosToggle.checked).toBe(false);

        // Verify all platforms are unchecked
        const twitchToggle = container.querySelector('input#toggle-twitch') as HTMLInputElement;
        const youtubeToggle = container.querySelector('input#toggle-youtube') as HTMLInputElement;
        
        expect(twitchToggle.checked).toBe(false);
        expect(youtubeToggle.checked).toBe(false);

        // Step 2: User types a message
        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
        const testMessage = 'This message should not be sent';
        
        await user.type(messageInput, testMessage);
        expect(messageInput.value).toBe(testMessage);

        // Step 3: User clicks send button
        const sendButton = screen.getByRole('button', { name: /enviar/i });
        await user.click(sendButton);

        // Step 4: Verify warning notification is displayed
        expect(toast.warning).toHaveBeenCalledTimes(1);
        expect(toast.warning).toHaveBeenCalledWith('Selecciona al menos una plataforma');

        // Step 5: Verify no socket event was emitted
        expect(socket.emit).not.toHaveBeenCalled();

        // Step 6: Verify message remains in input
        expect(messageInput.value).toBe(testMessage);

        // Step 7: Verify send button remains enabled (not in sending state)
        expect(sendButton).not.toBeDisabled();
    });

    /**
     * Test: Usuario intenta enviar mensaje vacío
     * Requirements: 2.1
     * 
     * This test validates that the system prevents sending empty messages:
     * 1. User clicks send without typing anything
     * 2. System shows error notification
     * 3. No socket event is emitted
     */
    it('should prevent sending empty messages', async () => {
        const user = userEvent.setup();

        render(
            <MemoryRouter>
                <ChatInput />
            </MemoryRouter>
        );

        // Step 1: User clicks send button without typing anything
        const sendButton = screen.getByRole('button', { name: /enviar/i });
        await user.click(sendButton);

        // Step 2: Verify error notification is displayed
        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledWith('El mensaje no puede estar vacío');

        // Step 3: Verify no socket event was emitted
        expect(socket.emit).not.toHaveBeenCalled();

        // Step 4: Verify send button remains enabled
        expect(sendButton).not.toBeDisabled();
    });

    /**
     * Test: Usuario intenta enviar mensaje con solo espacios en blanco
     * Requirements: 2.1
     * 
     * This test validates that the system prevents sending whitespace-only messages:
     * 1. User types only whitespace characters
     * 2. User clicks send
     * 3. System shows error notification
     * 4. No socket event is emitted
     * 5. Message remains in input
     */
    it('should prevent sending whitespace-only messages', async () => {
        const user = userEvent.setup();

        render(
            <MemoryRouter>
                <ChatInput />
            </MemoryRouter>
        );

        // Step 1: User types only whitespace
        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
        const whitespaceMessage = '     ';
        
        await user.type(messageInput, whitespaceMessage);
        expect(messageInput.value).toBe(whitespaceMessage);

        // Step 2: User clicks send button
        const sendButton = screen.getByRole('button', { name: /enviar/i });
        await user.click(sendButton);

        // Step 3: Verify error notification is displayed
        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledWith('El mensaje no puede estar vacío');

        // Step 4: Verify no socket event was emitted
        expect(socket.emit).not.toHaveBeenCalled();

        // Step 5: Verify message remains in input (for user to correct)
        expect(messageInput.value).toBe(whitespaceMessage);
    });

    /**
     * Test: Una plataforma falla, otras continúan
     * Requirements: 9.2, 10.2
     * 
     * This test validates graceful degradation when some platforms fail:
     * 1. User sends message to multiple platforms
     * 2. One platform succeeds, others fail
     * 3. System shows partial success notification with details
     * 4. Input is cleared (partial success still clears)
     * 5. User can see which platforms succeeded and which failed
     */
    it('should handle partial failure gracefully - one platform fails, others continue', async () => {
        const user = userEvent.setup();

        render(
            <MemoryRouter>
                <ChatInput />
            </MemoryRouter>
        );

        // Step 1: User types a message
        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
        const testMessage = 'Testing partial failure scenario';
        
        await user.type(messageInput, testMessage);
        expect(messageInput.value).toBe(testMessage);

        // Step 2: User sends message (twitch and youtube selected by default)
        const sendButton = screen.getByRole('button', { name: /enviar/i });
        await user.click(sendButton);

        // Step 3: Verify socket event was emitted
        expect(socket.emit).toHaveBeenCalledTimes(1);
        expect(socket.emit).toHaveBeenCalledWith('send_message', {
            userId: 'test-user-123',
            message: testMessage,
            platforms: ['twitch', 'youtube']
        });

        // Step 4: Simulate server response with partial success
        // Twitch succeeds, YouTube fails
        const partialResult: MessageSentResult = {
            success: true, // At least one succeeded
            results: [
                { platform: 'twitch', success: true },
                { 
                    platform: 'youtube', 
                    success: false, 
                    error: 'No hay stream en vivo',
                    errorCode: 'NO_LIVE_BROADCAST'
                }
            ]
        };

        const handler = (socket as any)._handlers['message_sent_result'];
        handler(partialResult);

        // Step 5: Verify partial success notification is displayed
        await waitFor(() => {
            expect(toast.warning).toHaveBeenCalledTimes(1);
        });

        const warningMessage = (toast.warning as any).mock.calls[0][0];

        // Step 6: Verify notification includes successful platform
        expect(warningMessage).toContain('twitch');

        // Step 7: Verify notification includes failed platform with error details
        expect(warningMessage).toContain('youtube');
        expect(warningMessage).toContain('No hay stream en vivo');

        // Step 8: Verify input is cleared (partial success still clears)
        expect(messageInput.value).toBe('');

        // Step 9: Verify only warning was called, not success or error
        expect(toast.success).not.toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
    });

    /**
     * Test: Todas las plataformas fallan
     * Requirements: 9.2, 10.2
     * 
     * This test validates complete failure handling:
     * 1. User sends message to multiple platforms
     * 2. All platforms fail
     * 3. System shows error notification with all failure details
     * 4. Input is NOT cleared (allows user to retry)
     */
    it('should handle complete failure - all platforms fail', async () => {
        const user = userEvent.setup();

        render(
            <MemoryRouter>
                <ChatInput />
            </MemoryRouter>
        );

        // Step 1: User types a message
        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
        const testMessage = 'Testing complete failure scenario';
        
        await user.type(messageInput, testMessage);
        expect(messageInput.value).toBe(testMessage);

        // Step 2: User sends message
        const sendButton = screen.getByRole('button', { name: /enviar/i });
        await user.click(sendButton);

        // Step 3: Simulate server response with complete failure
        const completeFailure: MessageSentResult = {
            success: false, // All failed
            results: [
                { 
                    platform: 'twitch', 
                    success: false, 
                    error: 'No conectado',
                    errorCode: 'NOT_CONNECTED'
                },
                { 
                    platform: 'youtube', 
                    success: false, 
                    error: 'Token inválido',
                    errorCode: 'INVALID_TOKEN'
                }
            ]
        };

        const handler = (socket as any)._handlers['message_sent_result'];
        handler(completeFailure);

        // Step 4: Verify error notification is displayed
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledTimes(1);
        });

        const errorMessage = (toast.error as any).mock.calls[0][0];

        // Step 5: Verify notification includes all failed platforms with details
        expect(errorMessage).toContain('twitch');
        expect(errorMessage).toContain('No conectado');
        expect(errorMessage).toContain('youtube');
        expect(errorMessage).toContain('Token inválido');

        // Step 6: Verify input is NOT cleared (allows retry)
        expect(messageInput.value).toBe(testMessage);

        // Step 7: Verify only error was called, not success or warning
        expect(toast.success).not.toHaveBeenCalled();
        expect(toast.warning).not.toHaveBeenCalled();
    });

    /**
     * Test: Socket desconectado previene envío
     * Requirements: 3.1
     * 
     * This test validates that the system handles socket disconnection:
     * 1. Socket is disconnected
     * 2. User tries to send message
     * 3. System shows error notification
     * 4. No socket event is emitted
     * 5. Message remains in input
     */
    it('should prevent sending when socket is disconnected', async () => {
        const user = userEvent.setup();

        // Set socket as disconnected
        (socket as any).connected = false;

        render(
            <MemoryRouter>
                <ChatInput />
            </MemoryRouter>
        );

        // Step 1: User types a message
        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
        const testMessage = 'This should not be sent';
        
        await user.type(messageInput, testMessage);
        expect(messageInput.value).toBe(testMessage);

        // Step 2: User clicks send button
        const sendButton = screen.getByRole('button', { name: /enviar/i });
        await user.click(sendButton);

        // Step 3: Verify error notification is displayed
        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledWith('No hay conexión con el servidor');

        // Step 4: Verify no socket event was emitted
        expect(socket.emit).not.toHaveBeenCalled();

        // Step 5: Verify message remains in input
        expect(messageInput.value).toBe(testMessage);

        // Step 6: Verify send button remains enabled
        expect(sendButton).not.toBeDisabled();
    });

    /**
     * Test: Usuario puede enviar con Enter key
     * Requirements: 3.1
     * 
     * This test validates keyboard interaction:
     * 1. User types message
     * 2. User presses Enter
     * 3. Message is sent
     */
    it('should send message when user presses Enter key', async () => {
        const user = userEvent.setup();

        render(
            <MemoryRouter>
                <ChatInput />
            </MemoryRouter>
        );

        // Step 1: User types a message
        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
        const testMessage = 'Sending with Enter key';
        
        await user.type(messageInput, testMessage);
        expect(messageInput.value).toBe(testMessage);

        // Step 2: User presses Enter
        await user.type(messageInput, '{Enter}');

        // Step 3: Verify socket event was emitted
        expect(socket.emit).toHaveBeenCalledTimes(1);
        expect(socket.emit).toHaveBeenCalledWith('send_message', {
            userId: 'test-user-123',
            message: testMessage,
            platforms: ['twitch', 'youtube']
        });
    });

    /**
     * Test: Usuario selecciona plataformas específicas antes de enviar
     * Requirements: 1.1, 3.1
     * 
     * This test validates custom platform selection:
     * 1. User unchecks YouTube
     * 2. User types message
     * 3. User sends
     * 4. Only Twitch is included in payload
     */
    it('should send to only selected platforms', async () => {
        const user = userEvent.setup();

        const { container } = render(
            <MemoryRouter>
                <ChatInput />
            </MemoryRouter>
        );

        // Step 1: Uncheck YouTube, keep Twitch
        const youtubeToggle = container.querySelector('input#toggle-youtube') as HTMLInputElement;
        expect(youtubeToggle.checked).toBe(true);
        
        await user.click(youtubeToggle);
        expect(youtubeToggle.checked).toBe(false);

        // Verify Twitch is still checked
        const twitchToggle = container.querySelector('input#toggle-twitch') as HTMLInputElement;
        expect(twitchToggle.checked).toBe(true);

        // Step 2: User types a message
        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
        const testMessage = 'Only to Twitch';
        
        await user.type(messageInput, testMessage);

        // Step 3: User sends message
        const sendButton = screen.getByRole('button', { name: /enviar/i });
        await user.click(sendButton);

        // Step 4: Verify socket event includes only Twitch
        expect(socket.emit).toHaveBeenCalledTimes(1);
        expect(socket.emit).toHaveBeenCalledWith('send_message', {
            userId: 'test-user-123',
            message: testMessage,
            platforms: ['twitch'] // Only Twitch
        });
    });

    /**
     * Test: Mensaje se trimea antes de enviar
     * Requirements: 3.1
     * 
     * This test validates that leading/trailing whitespace is removed:
     * 1. User types message with extra spaces
     * 2. User sends
     * 3. Payload contains trimmed message
     */
    it('should trim message before sending', async () => {
        const user = userEvent.setup();

        render(
            <MemoryRouter>
                <ChatInput />
            </MemoryRouter>
        );

        // Step 1: User types message with leading and trailing spaces
        const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
        const messageWithSpaces = '   Hello with spaces   ';
        const expectedTrimmed = 'Hello with spaces';
        
        await user.type(messageInput, messageWithSpaces);
        expect(messageInput.value).toBe(messageWithSpaces);

        // Step 2: User sends message
        const sendButton = screen.getByRole('button', { name: /enviar/i });
        await user.click(sendButton);

        // Step 3: Verify socket event contains trimmed message
        expect(socket.emit).toHaveBeenCalledTimes(1);
        
        const emitCall = (socket.emit as any).mock.calls[0];
        const payload = emitCall[1] as SendMessagePayload;
        
        expect(payload.message).toBe(expectedTrimmed);
        expect(payload.message).not.toBe(messageWithSpaces);
    });
});
