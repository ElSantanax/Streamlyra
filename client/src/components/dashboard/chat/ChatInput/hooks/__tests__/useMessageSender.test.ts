import { renderHook, act } from '@testing-library/react';
import { useMessageSender } from '../useMessageSender';
import { socket } from '../../../../../../services/socket';
import { toast } from '../../../../../../lib/notifications/toast';
import { validateMessage } from '../../utils/messageValidation';
import { useConnectionsStatus } from '../../../../../../hooks/useConnections';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User, MessageSentResult } from '../../../../../../types';

vi.mock('../../../../../../services/socket', () => ({
    socket: {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
        connected: true
    }
}));

vi.mock('../../../../../../lib/notifications/toast', () => ({
    toast: {
        error: vi.fn(),
        warning: vi.fn(),
        success: vi.fn()
    }
}));

vi.mock('../../utils/messageValidation', () => ({
    validateMessage: vi.fn()
}));

// Mockeamos la ruta real desde donde se importa el hook
vi.mock('../../../../../../hooks/useConnections', () => ({
    useConnectionsStatus: vi.fn()
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: unknown) => typeof options === 'object' ? `${key}_interpolated` : key
    })
}));

describe('useMessageSender', () => {
    const mockUser = { id: 'user-1' } as User;
    const mockClearMessage = vi.fn();
    const mockFocusInput = vi.fn();
    const mockGetConnectedPlatforms = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useConnectionsStatus).mockReturnValue({
            getConnectedPlatforms: mockGetConnectedPlatforms
        } as unknown as ReturnType<typeof useConnectionsStatus>);
        socket.connected = true;
    });

    it('debería enviar el mensaje correctamente si todas las validaciones pasan', () => {
        vi.mocked(validateMessage).mockReturnValue(true);
        mockGetConnectedPlatforms.mockReturnValue(['twitch']);

        const { result } = renderHook(() => useMessageSender(mockUser, 'test message', mockClearMessage, mockFocusInput));

        act(() => {
            result.current.handleSendMessage();
        });

        expect(socket.emit).toHaveBeenCalledWith('send_message', expect.objectContaining({
            userId: 'user-1',
            message: 'test message',
            platforms: ['twitch']
        }));
        expect(mockClearMessage).toHaveBeenCalled();
        expect(mockFocusInput).toHaveBeenCalled();
        expect(result.current.isSending).toBe(true);
    });

    it('debería mostrar error si el mensaje no es válido', () => {
        vi.mocked(validateMessage).mockReturnValue(false);

        const { result } = renderHook(() => useMessageSender(mockUser, '', mockClearMessage, mockFocusInput));

        act(() => {
            result.current.handleSendMessage();
        });

        expect(toast.error).toHaveBeenCalledWith('validation.messageEmpty');
        expect(socket.emit).not.toHaveBeenCalled();
    });

    it('debería mostrar error si el socket está desconectado', () => {
        vi.mocked(validateMessage).mockReturnValue(true);
        (socket as unknown as { connected: boolean }).connected = false;

        const { result } = renderHook(() => useMessageSender(mockUser, 'msg', mockClearMessage, mockFocusInput));

        act(() => {
            result.current.handleSendMessage();
        });

        expect(toast.error).toHaveBeenCalledWith('validation.noServerConnection');
    });

    it('debería manejar el resultado de éxito total del servidor', () => {
        renderHook(() => useMessageSender(mockUser, 'msg', mockClearMessage, mockFocusInput));

        const handleResult = vi.mocked(socket.on).mock.calls.find(call => call[0] === 'message_sent_result')?.[1] as (r: MessageSentResult) => void;

        act(() => {
            handleResult({
                success: true,
                results: [{ platform: 'twitch', success: true }]
            });
        });

        // No debería haber toast de error ni warning en éxito total
        expect(toast.error).not.toHaveBeenCalled();
        expect(toast.warning).not.toHaveBeenCalled();
    });

    it('debería manejar éxito parcial del servidor', () => {
        renderHook(() => useMessageSender(mockUser, 'msg', mockClearMessage, mockFocusInput));

        const handleResult = vi.mocked(socket.on).mock.calls.find(call => call[0] === 'message_sent_result')?.[1] as (r: MessageSentResult) => void;

        act(() => {
            handleResult({
                success: true,
                results: [
                    { platform: 'twitch', success: true },
                    { platform: 'youtube', success: false, error: 'fail' }
                ]
            });
        });

        expect(toast.warning).toHaveBeenCalledWith('validation.partialSuccess_interpolated');
    });

    it('debería manejar error total del servidor', () => {
        renderHook(() => useMessageSender(mockUser, 'msg', mockClearMessage, mockFocusInput));

        const handleResult = vi.mocked(socket.on).mock.calls.find(call => call[0] === 'message_sent_result')?.[1] as (r: MessageSentResult) => void;

        act(() => {
            handleResult({
                success: false,
                results: [
                    { platform: 'twitch', success: false, error: 'fail' }
                ]
            });
        });

        expect(toast.error).toHaveBeenCalledWith('validation.sendError_interpolated');
    });
});
