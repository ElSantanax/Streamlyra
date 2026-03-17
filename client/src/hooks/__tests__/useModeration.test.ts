import { renderHook, act } from '@testing-library/react';
import { useModeration } from '../useModeration';
import { toast } from '../../lib/notifications';
import { useAuth } from '../useAuth';
import { useChatStore } from '../../store/useChatStore';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/socket', () => ({
    socket: {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn()
    }
}));

vi.mock('../../lib/notifications', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn()
    }
}));

vi.mock('../../lib/dialog', () => ({
    dialog: {
        danger: vi.fn()
    }
}));

vi.mock('../useAuth', () => ({
    useAuth: vi.fn()
}));

vi.mock('../../store/useChatStore', () => ({
    useChatStore: vi.fn()
}));

describe('useModeration', () => {
    const mockUser = { id: 'admin-1' };
    const mockStoreDelete = vi.fn();
    const mockStoreBan = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({ user: mockUser } as unknown as ReturnType<typeof useAuth>);
        vi.mocked(useChatStore).mockReturnValue({
            deleteMessage: mockStoreDelete,
            banUser: mockStoreBan
        } as unknown as ReturnType<typeof useChatStore>);
    });

    it('debería delegar el borrado de mensajes al store de Zustand', () => {
        const { result } = renderHook(() => useModeration());
        
        act(() => {
            result.current.deleteMessage('msg-1', 'twitch', { t: '1' });
        });

        expect(mockStoreDelete).toHaveBeenCalledWith('msg-1', 'twitch', 'admin-1', { t: '1' });
    });

    it('debería delegar el baneo de usuarios al store de Zustand', async () => {
        const { result } = renderHook(() => useModeration());
        
        await act(async () => {
            await result.current.banUser('user-1', 'badguy', 'twitch');
        });

        expect(mockStoreBan).toHaveBeenCalledWith('user-1', 'badguy', 'twitch', 'admin-1');
    });

    it('no debería ejecutar acciones si el usuario no está autenticado', () => {
        vi.mocked(useAuth).mockReturnValue({ user: null } as unknown as ReturnType<typeof useAuth>);
        const { result } = renderHook(() => useModeration());
        
        act(() => {
            result.current.deleteMessage('msg-1', 'twitch');
        });

        expect(mockStoreDelete).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalled();
    });

    it('debería lanzar un evento custom al responder a un usuario', () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        const { result } = renderHook(() => useModeration());
        
        act(() => {
            result.current.replyToUser('testuser');
        });

        expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
        expect(dispatchSpy.mock.calls[0][0].type).toBe('reply_to_user');
    });
});
