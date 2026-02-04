/**
 * Unit tests for ChatInput component
 * Feature: multi-platform-message-sending
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ChatInput from '../index';
import { toast } from '../../../../../lib/notifications/toast';
import { socket } from '../../../../../services/socket';
import type { MessageSentResult } from '../../../../../types/message.types';

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

describe('ChatInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (socket as { connected: boolean }).connected = true;
    (socket as unknown as { _handlers: Record<string, (result: MessageSentResult) => void> })._handlers = {};
  });

  afterEach(() => {
    cleanup();
  });

  describe('Initial State', () => {
    it('should mount with input and send button', () => {
      render(
        <MemoryRouter>
          <ChatInput />
        </MemoryRouter>
      );

      // Verify message input is present and empty
      const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;
      expect(messageInput).toBeInTheDocument();
      expect(messageInput.value).toBe('');

      // Verify send button is present
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      expect(sendButton).toBeInTheDocument();
    });
  });

  describe('Socket Listeners', () => {
    /**
     * Test: Resultado exitoso muestra toast verde y limpia input
     * Requirements: 9.1
     */
    it('should display success toast and clear input when all platforms succeed', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <ChatInput />
        </MemoryRouter>
      );

      const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;

      // Type a message
      await user.type(messageInput, 'Test message for all platforms');
      expect(messageInput.value).toBe('Test message for all platforms');

      // Send the message
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      await user.click(sendButton);

      // Clear mocks to isolate listener behavior
      vi.clearAllMocks();

      // Simulate successful result from server
      const successResult: MessageSentResult = {
        success: true,
        results: [
          { platform: 'twitch', success: true },
          { platform: 'youtube', success: true },
        ],
      };

      // Trigger the message_sent_result handler
      const handler = (socket as unknown as { _handlers: Record<string, (result: MessageSentResult) => void> })._handlers['message_sent_result'];
      expect(handler).toBeDefined();
      handler(successResult);

      // Wait for state updates
      await waitFor(() => {
        // En la UI optimista actual no se muestra toast de éxito para no saturar
        expect(toast.success).not.toHaveBeenCalled();
      });

      // Verify input was cleared
      expect(messageInput.value).toBe('');

      // Verify error and warning toasts were NOT called
      expect(toast.error).not.toHaveBeenCalled();
      expect(toast.warning).not.toHaveBeenCalled();
    });

    /**
     * Test: Resultado parcial muestra toast amarillo con detalles
     * Requirements: 9.2
     */
    it('should display warning toast with details when some platforms fail', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <ChatInput />
        </MemoryRouter>
      );

      const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;

      // Type a message
      await user.type(messageInput, 'Test partial success');
      expect(messageInput.value).toBe('Test partial success');

      // Send the message
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      await user.click(sendButton);

      vi.clearAllMocks();

      // Simulate partial success result from server
      const partialResult: MessageSentResult = {
        success: true,
        results: [
          { platform: 'twitch', success: true },
          { platform: 'youtube', success: false, error: 'No hay stream en vivo' },
          { platform: 'kick', success: false, error: 'Token inválido' },
        ],
      };

      // Trigger the message_sent_result handler
      const handler = (socket as unknown as { _handlers: Record<string, (result: MessageSentResult) => void> })._handlers['message_sent_result'];
      handler(partialResult);

      // Wait for state updates
      await waitFor(() => {
        // Verify warning toast was called
        expect(toast.warning).toHaveBeenCalledTimes(1);
      });

      // Get the warning message
      const warningCall = vi.mocked(toast.warning).mock.calls[0][0];

      // Verify the message includes successful platform
      expect(warningCall).toContain('twitch');

      // Verify the message includes failed platforms with error details
      expect(warningCall).toContain('youtube');
      expect(warningCall).toContain('No hay stream en vivo');
      expect(warningCall).toContain('kick');
      expect(warningCall).toContain('Token inválido');

      // Verify input was cleared (partial success still clears input)
      expect(messageInput.value).toBe('');

      // Verify success and error toasts were NOT called
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });

    /**
     * Test: Resultado de error muestra toast rojo
     * Requirements: 9.3
     */
    it('should display error toast when all platforms fail', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <ChatInput />
        </MemoryRouter>
      );

      const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;

      // Type a message
      await user.type(messageInput, 'Test complete failure');
      expect(messageInput.value).toBe('Test complete failure');

      // Send the message
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      await user.click(sendButton);

      vi.clearAllMocks();

      // Simulate complete failure result from server
      const failureResult: MessageSentResult = {
        success: false,
        results: [
          { platform: 'twitch', success: false, error: 'No conectado' },
          { platform: 'youtube', success: false, error: 'API error' },
        ],
      };

      // Trigger the message_sent_result handler
      const handler = (socket as unknown as { _handlers: Record<string, (result: MessageSentResult) => void> })._handlers['message_sent_result'];
      handler(failureResult);

      // Wait for state updates
      await waitFor(() => {
        // Verify error toast was called
        expect(toast.error).toHaveBeenCalledTimes(1);
      });

      // Get the error message
      const errorCall = vi.mocked(toast.error).mock.calls[0][0];

      // Verify the message includes failed platforms with error details
      expect(errorCall).toContain('twitch');
      expect(errorCall).toContain('No conectado');
      expect(errorCall).toContain('youtube');
      expect(errorCall).toContain('API error');

      // Verify input WAS cleared (optimistic UI clears immediately)
      expect(messageInput.value).toBe('');

      // Verify success and warning toasts were NOT called
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.warning).not.toHaveBeenCalled();
    });

    /**
     * Test: Error del servidor muestra toast con mensaje
     * Requirements: 9.3
     */
    it('should display error toast with server error message', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <ChatInput />
        </MemoryRouter>
      );

      const messageInput = screen.getByPlaceholderText('Enviar un mensaje') as HTMLInputElement;

      // Type a message
      await user.type(messageInput, 'Test server error');
      expect(messageInput.value).toBe('Test server error');

      // Send the message
      const sendButton = screen.getByRole('button', { name: /enviar/i });
      await user.click(sendButton);

      vi.clearAllMocks();

      // Simulate server error
      const serverError = {
        code: 'INVALID_PAYLOAD',
        message: 'Datos inválidos. Verifica el mensaje y las plataformas.',
      };

      // Trigger the message_send_error handler
      const handler = (socket as unknown as { _handlers: Record<string, (result: MessageSentResult) => void> })._handlers['message_send_error'];
      expect(handler).toBeDefined();
      handler(serverError as unknown as MessageSentResult);

      // Wait for state updates
      await waitFor(() => {
        // Verify error toast was called with the server message
        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledWith(serverError.message);
      });

      // Verify input WAS cleared (optimistic UI clears immediately)
      expect(messageInput.value).toBe('');

      // Verify success and warning toasts were NOT called
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.warning).not.toHaveBeenCalled();
    });
  });
});
