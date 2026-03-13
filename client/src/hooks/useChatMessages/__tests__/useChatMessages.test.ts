import { renderHook, act } from '@testing-library/react';
import { useChatMessages } from '../useChatMessages';
import type { ChatMessage } from '../../../types';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useChatMessages', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('debería inicializar con un array de mensajes vacío', () => {
        const { result } = renderHook(() => useChatMessages());
        expect(result.current.messages).toEqual([]);
    });

    it('debería añadir un mensaje después del intervalo de flush', () => {
        const { result } = renderHook(() => useChatMessages());
        const mockMsg: ChatMessage = {
            id: '1',
            platform: 'twitch',
            message: 'hola',
            user: 'user1',
            time: '12:00'
        };

        act(() => {
            result.current.addMessage(mockMsg);
        });

        expect(result.current.messages).toHaveLength(0);

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0]).toEqual(expect.objectContaining({ id: '1', message: 'hola' }));
    });

    it('debería acumular múltiples mensajes y añadirlos en un solo batch', () => {
        const { result } = renderHook(() => useChatMessages());

        act(() => {
            result.current.addMessage({ id: '1', platform: 'twitch' as const, message: 'm1', user: 'u', time: 't' });
            result.current.addMessage({ id: '2', platform: 'twitch' as const, message: 'm2', user: 'u', time: 't' });
        });

        expect(result.current.messages).toHaveLength(0);

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(result.current.messages).toHaveLength(2);
    });

    it('debería filtrar mensajes duplicados por ID y Plataforma', () => {
        const { result } = renderHook(() => useChatMessages());
        const msg = { id: '1', platform: 'twitch' as const, message: 'm', user: 'u', time: 't' };

        act(() => {
            result.current.addMessage(msg);
            vi.advanceTimersByTime(300);
        });

        expect(result.current.messages).toHaveLength(1);

        act(() => {
            result.current.addMessage(msg);
            vi.advanceTimersByTime(300);
        });

        expect(result.current.messages).toHaveLength(1);
    });

    it('debería actualizar el estado de un mensaje enviando los pendientes inmediatamente', () => {
        const { result } = renderHook(() => useChatMessages());
        const msg = { id: '1', platform: 'twitch' as const, message: 'm', user: 'u', time: 't', status: 'sending' as const };

        act(() => {
            result.current.addMessage(msg);
            result.current.updateMessageStatus('1', 'sent');
        });

        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].status).toBe('sent');
    });

    it('debería eliminar un mensaje por ID', () => {
        const { result } = renderHook(() => useChatMessages());

        act(() => {
            result.current.addMessage({ id: '1', platform: 'twitch' as const, message: 'm', user: 'u', time: 't' });
            vi.advanceTimersByTime(300);
        });

        expect(result.current.messages).toHaveLength(1);

        act(() => {
            result.current.removeMessage('1');
        });

        expect(result.current.messages).toHaveLength(0);
    });

    it('debería vaciar todos los mensajes', () => {
        const { result } = renderHook(() => useChatMessages());

        act(() => {
            result.current.addMessage({ id: '1', platform: 'twitch' as const, message: 'm', user: 'u', time: 't' });
            vi.advanceTimersByTime(300);
        });

        expect(result.current.messages).toHaveLength(1);

        act(() => {
            result.current.clearMessages();
        });

        expect(result.current.messages).toHaveLength(0);
    });

    it('debería truncar mensajes cuando exceden el límite', () => {
        const { result } = renderHook(() => useChatMessages());

        act(() => {
            for (let i = 0; i < 1110; i++) {
                result.current.addMessage({ id: `id-${i}`, platform: 'twitch' as const, message: 'm', user: 'u', time: 't' });
            }
            vi.advanceTimersByTime(300);
        });

        expect(result.current.messages.length).toBe(1000);
        expect(result.current.messages[0].id).toBe('id-110');
    });
});