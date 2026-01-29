/**
 * Tests para useSocket hook
 * Verifica que los listeners se limpien correctamente y no se dupliquen
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock socket module before importing
vi.mock('../../services/socket', () => ({
  socket: {
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));

import { useSocket } from '../useSocket';
import { socket } from '../../services/socket';

describe('useSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset socket state
    (socket as { connected: boolean }).connected = false;
  });

  describe('Limpieza de Listeners', () => {
    it('debe limpiar listeners de conexión al desmontar', () => {
      const { unmount } = renderHook(() =>
        useSocket({
          userId: 'user-123',
        })
      );

      // Verificar que se registraron los listeners
      expect(socket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('reconnect', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));

      // Desmontar el hook
      unmount();

      // Verificar que se limpiaron los listeners
      expect(socket.off).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(socket.off).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(socket.off).toHaveBeenCalledWith('reconnect', expect.any(Function));
      expect(socket.off).toHaveBeenCalledWith('connect_error', expect.any(Function));
    });

    it('debe limpiar listeners de mensajes al desmontar', () => {
      const onChatMessage = vi.fn();
      const onViewersUpdate = vi.fn();
      const onConnectionStatus = vi.fn();

      const { unmount } = renderHook(() =>
        useSocket({
          userId: 'user-123',
          onChatMessage,
          onViewersUpdate,
          onConnectionStatus,
        })
      );

      // Verificar que se registraron los listeners de mensajes
      expect(socket.on).toHaveBeenCalledWith('chat_message', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('viewers_update', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('connection_status', expect.any(Function));

      // Desmontar el hook
      unmount();

      // Verificar que se limpiaron los listeners de mensajes
      expect(socket.off).toHaveBeenCalledWith('chat_message', expect.any(Function));
      expect(socket.off).toHaveBeenCalledWith('viewers_update', expect.any(Function));
      expect(socket.off).toHaveBeenCalledWith('connection_status', expect.any(Function));
    });

    it('NO debe registrar listeners duplicados cuando cambian los callbacks', async () => {
      const onChatMessage1 = vi.fn();
      const onChatMessage2 = vi.fn();

      const { rerender } = renderHook(
        ({ callback }) =>
          useSocket({
            userId: 'user-123',
            onChatMessage: callback,
          }),
        {
          initialProps: { callback: onChatMessage1 },
        }
      );

      // Contar cuántas veces se registró 'chat_message' inicialmente
      const initialOnCalls = vi.mocked(socket.on).mock.calls.filter(
        (call: unknown[]) => call[0] === 'chat_message'
      ).length;

      expect(initialOnCalls).toBe(1);

      // Limpiar mocks para contar solo las nuevas llamadas
      vi.clearAllMocks();

      // Cambiar el callback (esto causaría re-registro en la versión buggy)
      rerender({ callback: onChatMessage2 });

      await waitFor(() => {
        // NO debe registrar el listener de nuevo
        const newOnCalls = vi.mocked(socket.on).mock.calls.filter(
          (call: unknown[]) => call[0] === 'chat_message'
        ).length;

        expect(newOnCalls).toBe(0); // No debe haber nuevos registros
      });
    });

    it('NO debe registrar listeners duplicados en múltiples re-renders', async () => {
      const { rerender } = renderHook(
        ({ count }) =>
          useSocket({
            userId: 'user-123',
            onChatMessage: () => console.log(count), // Callback diferente en cada render
          }),
        {
          initialProps: { count: 0 },
        }
      );

      // Contar registros iniciales
      const initialOnCalls = vi.mocked(socket.on).mock.calls.filter(
        (call: unknown[]) => call[0] === 'chat_message'
      ).length;

      expect(initialOnCalls).toBe(1);

      // Limpiar mocks
      vi.clearAllMocks();

      // Hacer múltiples re-renders
      for (let i = 1; i <= 5; i++) {
        rerender({ count: i });
      }

      await waitFor(() => {
        // NO debe haber nuevos registros
        const newOnCalls = vi.mocked(socket.on).mock.calls.filter(
          (call: unknown[]) => call[0] === 'chat_message'
        ).length;

        expect(newOnCalls).toBe(0);
      });
    });

    it('debe usar refs para callbacks actualizados sin re-registrar listeners', async () => {
      type MessageCallback = (msg: unknown) => void;
      let capturedCallback: MessageCallback | null = null;

      // Mock socket.on para capturar el callback
      const originalOn = socket.on;
      vi.mocked(socket.on).mockImplementation((event: string, callback: MessageCallback) => {
        if (event === 'chat_message') {
          capturedCallback = callback;
        }
        return socket as never;
      });

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const { rerender } = renderHook(
        ({ callback }) =>
          useSocket({
            userId: 'user-123',
            onChatMessage: callback,
            connections: {
              twitch: { connected: true, status: 'connected' },
            },
          }),
        {
          initialProps: { callback: callback1 },
        }
      );

      // Esperar a que se registre el callback
      await waitFor(() => {
        expect(capturedCallback).not.toBeNull();
      });

      const originalCallback = capturedCallback!;

      // Simular mensaje
      originalCallback({
        id: '1',
        username: 'test',
        message: 'hello',
        platform: 'twitch',
      });

      await waitFor(() => {
        expect(callback1).toHaveBeenCalledTimes(1);
      });
      expect(callback2).toHaveBeenCalledTimes(0);

      // Cambiar callback
      rerender({ callback: callback2 });

      await waitFor(() => {
        // El callback registrado debe ser el mismo (no se re-registró)
        expect(capturedCallback).toBe(originalCallback);
      });

      // Simular otro mensaje - debe usar el nuevo callback
      originalCallback({
        id: '2',
        username: 'test',
        message: 'world',
        platform: 'twitch',
      });

      await waitFor(() => {
        // El nuevo callback debe ser llamado
        expect(callback2).toHaveBeenCalledTimes(1);
      });
      // El viejo callback no debe ser llamado de nuevo
      expect(callback1).toHaveBeenCalledTimes(1);

      // Restaurar mock
      socket.on = originalOn;
    });
  });

  describe('Funcionalidad Básica', () => {
    it('debe conectar el socket al montar', () => {
      renderHook(() =>
        useSocket({
          userId: 'user-123',
        })
      );

      expect(socket.connect).toHaveBeenCalled();
    });

    it('debe identificar al usuario cuando se conecta', () => {
      (socket as { connected: boolean }).connected = true;

      renderHook(() =>
        useSocket({
          userId: 'user-123',
        })
      );

      expect(socket.emit).toHaveBeenCalledWith('identify', 'user-123');
    });

    it('debe retornar funciones de connect y disconnect', () => {
      const { result } = renderHook(() =>
        useSocket({
          userId: 'user-123',
        })
      );

      expect(result.current.connect).toBeInstanceOf(Function);
      expect(result.current.disconnect).toBeInstanceOf(Function);
    });

    it('debe filtrar mensajes de plataformas desconectadas', () => {
      type MessageCallback = (msg: unknown) => void;
      const onChatMessage = vi.fn();
      let capturedCallback: MessageCallback | null = null;

      vi.mocked(socket.on).mockImplementation((event: string, callback: MessageCallback) => {
        if (event === 'chat_message') {
          capturedCallback = callback;
        }
        return socket as never;
      });

      renderHook(() =>
        useSocket({
          userId: 'user-123',
          onChatMessage,
          connections: {
            twitch: { connected: true, status: 'connected' },
            kick: { connected: false, status: 'error' },
          },
        })
      );

      // Mensaje de plataforma conectada - debe pasar
      expect(capturedCallback).not.toBeNull();
      capturedCallback!({
        id: '1',
        username: 'test',
        message: 'hello',
        platform: 'twitch',
      });

      expect(onChatMessage).toHaveBeenCalledTimes(1);

      // Mensaje de plataforma desconectada - debe ser filtrado
      capturedCallback!({
        id: '2',
        username: 'test',
        message: 'world',
        platform: 'kick',
      });

      // No debe haber sido llamado de nuevo
      expect(onChatMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('debe manejar userId undefined', () => {
      const { result } = renderHook(() =>
        useSocket({
          userId: undefined,
        })
      );

      expect(result.current.isConnected).toBeDefined();
      expect(socket.emit).not.toHaveBeenCalledWith('identify', expect.anything());
    });

    it('debe manejar callbacks undefined', () => {
      expect(() => {
        renderHook(() =>
          useSocket({
            userId: 'user-123',
            onChatMessage: undefined,
            onViewersUpdate: undefined,
            onConnectionStatus: undefined,
          })
        );
      }).not.toThrow();
    });

    it('debe actualizar connections ref sin re-registrar listeners', async () => {
      const onChatMessage = vi.fn();

      const { rerender } = renderHook(
        ({ connections }) =>
          useSocket({
            userId: 'user-123',
            onChatMessage,
            connections,
          }),
        {
          initialProps: {
            connections: {
              twitch: { connected: true, status: 'connected' as const },
              kick: { connected: false, status: 'connected' as const },
            },
          },
        }
      );

      const initialOnCalls = vi.mocked(socket.on).mock.calls.length;

      // Cambiar connections
      rerender({
        connections: {
          twitch: { connected: false, status: 'connected' as const },
          kick: { connected: true, status: 'connected' as const },
        },
      });

      await waitFor(() => {
        // No debe haber nuevos registros de listeners
        const newOnCalls = vi.mocked(socket.on).mock.calls.length;
        expect(newOnCalls).toBe(initialOnCalls);
      });
    });
  });
});
