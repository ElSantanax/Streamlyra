import { renderHook, act } from '@testing-library/react';
import { useEmojiPicker } from '../useEmojiPicker';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EmojiClickData } from 'emoji-picker-react';

describe('useEmojiPicker', () => {
    const mockSetMessage = vi.fn();
    const mockInput = {
        focus: vi.fn(),
        setSelectionRange: vi.fn(),
        selectionStart: 5,
        selectionEnd: 5
    };
    const mockInputRef = { current: mockInput as unknown as HTMLInputElement };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    it('debería inicializar con showEmojiPicker en false', () => {
        const { result } = renderHook(() => useEmojiPicker('', mockSetMessage, mockInputRef));
        expect(result.current.showEmojiPicker).toBe(false);
    });

    it('debería cambiar el estado al llamar a toggleEmojiPicker', () => {
        const { result } = renderHook(() => useEmojiPicker('', mockSetMessage, mockInputRef));
        
        act(() => {
            result.current.toggleEmojiPicker();
        });
        expect(result.current.showEmojiPicker).toBe(true);

        act(() => {
            result.current.toggleEmojiPicker();
        });
        expect(result.current.showEmojiPicker).toBe(false);
    });

    it('debería insertar el emoji en la posición del cursor', () => {
        const message = 'Hello world';
        const { result } = renderHook(() => useEmojiPicker(message, mockSetMessage, mockInputRef));
        const emojiData = { emoji: '😀' } as EmojiClickData;

        act(() => {
            result.current.handleEmojiClick(emojiData);
        });

        // Insertar en posición 5: 'Hello' + '😀' + ' world'
        expect(mockSetMessage).toHaveBeenCalledWith('Hello😀 world');
        expect(result.current.showEmojiPicker).toBe(false);

        // Verificar el foco y la nueva posición del cursor (asíncronamente por el setTimeout)
        act(() => {
            vi.runAllTimers();
        });

        expect(mockInput.focus).toHaveBeenCalled();
        expect(mockInput.setSelectionRange).toHaveBeenCalledWith(5 + '😀'.length, 5 + '😀'.length);
    });

    it('debería cerrar el picker al hacer clic fuera', () => {
        const { result } = renderHook(() => useEmojiPicker('', mockSetMessage, mockInputRef));
        
        act(() => {
            result.current.toggleEmojiPicker();
        });
        expect(result.current.showEmojiPicker).toBe(true);

        // Simular clic fuera (mousedown)
        const mockDiv = document.createElement('div');
        (result.current.emojiPickerRef as { current: HTMLDivElement | null }).current = mockDiv;
        
        act(() => {
            const event = new MouseEvent('mousedown', { bubbles: true });
            // Cliquear en el body (fuera del mockDiv)
            document.dispatchEvent(event);
        });

        expect(result.current.showEmojiPicker).toBe(false);
    });
});
