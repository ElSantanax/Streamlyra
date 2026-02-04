import { useEffect, type RefObject } from 'react';

export const useReplyToUser = (
    setMessage: (message: string) => void,
    inputRef: RefObject<HTMLInputElement | null>
) => {
    useEffect(() => {
        const handleReplyToUser = (event: Event) => {
            const customEvent = event as CustomEvent<{ username: string }>;
            let { username } = customEvent.detail;

            if (username.startsWith('@')) {
                username = username.substring(1);
            }

            setMessage(`@${username} `);
            inputRef.current?.focus();
        };

        window.addEventListener('reply_to_user', handleReplyToUser);

        return () => {
            window.removeEventListener('reply_to_user', handleReplyToUser);
        };
    }, [setMessage, inputRef]);
};
