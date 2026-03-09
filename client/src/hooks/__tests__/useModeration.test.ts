import { renderHook, act } from '@testing-library/react';
import { useModeration } from '../useModeration';
import { socket } from '../../services/socket';
import { toast } from '../../lib/notifications';
import { dialog } from '../../lib/dialog';
import { useAuth } from '../useAuth';
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

describe('useModeration', () => {
    const mockUser = { id: 'admin-1' };
    const mockOnMessageDeleted = vi.fn();
    const mockOnUserBanned = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({ user: mockUser } as unknown as ReturnType<typeof useAuth>);
    });

    it('debería emitir acción de borrado y llamar al callback local', () => {
        const { result } = renderHook(() => useModeration({ onMessageDeleted: mockOnMessageDeleted }));
        
        act(() => {
            result.current.deleteMessage('msg-1', 'twitch');
        });

        expect(mockOnMessageDeleted).toHaveBeenCalledWith('msg-1');
        expect(socket.emit).toHaveBeenCalledWith('moderation_action', expect.objectContaining({
            action: 'delete',
            messageId: 'msg-1'
        }));
    });

    it('debería solicitar confirmación antes de banear y emitir si se confirma', async () => {
        vi.mocked(dialog.danger).mockResolvedValue(true);
        const { result } = renderHook(() => useModeration({ onUserBanned: mockOnUserBanned }));
        
        await act(async () => {
            await result.current.banUser('user-1', 'badguy', 'twitch');
        });

        expect(dialog.danger).toHaveBeenCalled();
        expect(socket.emit).toHaveBeenCalledWith('moderation_action', expect.objectContaining({
            action: 'ban',
            targetUserId: 'user-1'
        }));
    });

    it('no debería emitir baneo si el usuario cancela el diálogo', async () => {
        vi.mocked(dialog.danger).mockResolvedValue(false);
        const { result } = renderHook(() => useModeration());
        
        await act(async () => {
            await result.current.banUser('user-1', 'badguy', 'twitch');
        });

        expect(socket.emit).not.toHaveBeenCalled();
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

    it('debería manejar eventos de éxito del servidor', () => {
        renderHook(() => useModeration({ onMessageDeleted: mockOnMessageDeleted }));
        
        const handleSuccess = vi.mocked(socket.on).mock.calls.find(call => call[0] === 'moderation_success')?.[1] as (d: { action: string; message: string; messageId?: string }) => void;
        
        act(() => {
            handleSuccess({ action: 'delete', message: 'Borrado ok', messageId: 'msg-1' });
        });

        expect(toast.success).toHaveBeenCalledWith('Borrado ok');
        expect(mockOnMessageDeleted).toHaveBeenCalledWith('msg-1');
    });
});
