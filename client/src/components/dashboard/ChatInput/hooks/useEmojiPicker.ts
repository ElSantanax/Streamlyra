import { useState, useEffect, useRef, type RefObject } from 'react';
import type { EmojiClickData } from 'emoji-picker-react';

export const useEmojiPicker = (
    message: string,
    setMessage: (message: string) => void,
    inputRef: RefObject<HTMLInputElement | null>
) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(event.target as Node)
            ) {
                setShowEmojiPicker(false);
            }
        };

        if (showEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker]);

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        const input = inputRef.current;
        if (!input) return;

        const cursorPosition = input.selectionStart || message.length;
        const textBeforeCursor = message.substring(0, cursorPosition);
        const textAfterCursor = message.substring(cursorPosition);

        const newMessage = textBeforeCursor + emojiData.emoji + textAfterCursor;
        setMessage(newMessage);
        setShowEmojiPicker(false);

        setTimeout(() => {
            input.focus();
            const newCursorPosition = cursorPosition + emojiData.emoji.length;
            input.setSelectionRange(newCursorPosition, newCursorPosition);
        }, 0);
    };

    const toggleEmojiPicker = () => {
        setShowEmojiPicker(!showEmojiPicker);
    };

    return {
        showEmojiPicker,
        emojiPickerRef,
        handleEmojiClick,
        toggleEmojiPicker
    };
};
