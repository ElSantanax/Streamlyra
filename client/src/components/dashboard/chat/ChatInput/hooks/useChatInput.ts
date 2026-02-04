import { useState, useRef } from 'react';

export const useChatInput = () => {
    const [message, setMessage] = useState('');
    const inputRef = useRef<HTMLInputElement | null>(null);

    const clearMessage = () => {
        setMessage('');
    };

    const focusInput = () => {
        inputRef.current?.focus();
    };

    return {
        message,
        setMessage,
        inputRef,
        clearMessage,
        focusInput
    };
};
