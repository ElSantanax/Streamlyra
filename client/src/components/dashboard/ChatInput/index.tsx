import { useState, useEffect, useRef } from 'react';
import type { SendMessagePayload, MessageSentResult } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { socket } from '../../../services/socket';
import { toast } from '../../../lib/notifications/toast';

const ChatInput = () => {
    // Get user from auth context
    const { user } = useAuth();

    // State for message input
    const [message, setMessage] = useState('');

    // State for send operation status
    const [isSending, setIsSending] = useState(false);

    // Ref for the input element to maintain focus
    const inputRef = useRef<HTMLInputElement>(null);

    /**
     * Listener for reply_to_user custom event
     * Automatically adds @username to the input when replying
     */
    useEffect(() => {
        const handleReplyToUser = (event: Event) => {
            const customEvent = event as CustomEvent<{ username: string }>;
            const { username } = customEvent.detail;
            setMessage(`@${username} `);
            inputRef.current?.focus();
        };

        window.addEventListener('reply_to_user', handleReplyToUser);

        return () => {
            window.removeEventListener('reply_to_user', handleReplyToUser);
        };
    }, []);

    /**
     * Listener for message_sent_result event from server
     * Handles the result of sending messages to platforms
     */
    useEffect(() => {
        const handleMessageSentResult = (result: MessageSentResult) => {
            // Set isSending to false when result is received
            setIsSending(false);

            // Determine notification type based on results
            const successfulPlatforms = result.results.filter(r => r.success);
            const failedPlatforms = result.results.filter(r => !r.success);

            if (successfulPlatforms.length === result.results.length) {
                // Éxito total - Ya no mostramos toast para no saturar al usuario
                // El mensaje aparecerá en el chat como confirmación visual
            } else if (successfulPlatforms.length > 0) {
                // Partial success - show warning notification with details
                const successNames = successfulPlatforms.map(r => r.platform).join(', ');
                const failedDetails = failedPlatforms
                    .map(r => `${r.platform}: ${r.error || 'Error desconocido'}`)
                    .join(', ');
                toast.warning(`Mensaje enviado a ${successNames}. Falló en: ${failedDetails}`);
            } else {
                // All platforms failed - show error notification
                const errorDetails = failedPlatforms
                    .map(r => `${r.platform}: ${r.error || 'Error desconocido'}`)
                    .join(', ');
                toast.error(`Error al enviar mensaje. ${errorDetails}`);
            }
        };

        // Register listener
        socket.on('message_sent_result', handleMessageSentResult);

        // Cleanup listener on unmount
        return () => {
            socket.off('message_sent_result', handleMessageSentResult);
        };
    }, []); // Empty dependency array - listener only registered once

    /**
     * Listener for message_send_error event from server
     * Handles errors that occur during message sending process
     */
    useEffect(() => {
        const handleMessageSendError = (error: { code: string; message: string }) => {
            // Set isSending to false when error is received
            setIsSending(false);

            // Show error toast with the message received from server
            toast.error(error.message);
        };

        // Register listener
        socket.on('message_send_error', handleMessageSendError);

        // Cleanup listener on unmount
        return () => {
            socket.off('message_send_error', handleMessageSendError);
        };
    }, []); // Empty dependency array - listener only registered once

    /**
     * Validates that a message is not empty and doesn't contain only whitespace
     * @param message - The message to validate
     * @returns true if the message is valid, false otherwise
     */
    const validateMessage = (message: string): boolean => {
        // Check if message is not empty and doesn't contain only whitespace
        return message.trim().length > 0;
    };

    /**
     * Handles sending a message to all connected platforms
     * Validates message, verifies socket connection, and emits the send_message event
     */
    const handleSendMessage = () => {
        // Validate message using validateMessage
        if (!validateMessage(message)) {
            // Show error if message is invalid and maintain text in input
            toast.error('El mensaje no puede estar vacío');
            return;
        }

        // Verify that socket is connected
        if (!socket.connected) {
            // Show error if socket is not connected
            toast.error('No hay conexión con el servidor');
            return;
        }

        // Verify user is available
        if (!user?.id) {
            toast.error('Usuario no autenticado');
            return;
        }

        // Set isSending to true
        setIsSending(true);

        // Guardar mensaje antes de limpiar (por si falla)
        const messageToSend = message.trim();

        // Emit 'send_message' event with userId and message
        // Server will send to all connected platforms automatically
        const payload: SendMessagePayload = {
            userId: user.id,
            message: messageToSend,
            platforms: [] // Empty array signals to send to all connected platforms
        };

        socket.emit('send_message', payload);

        // Limpiar input solo después de emitir exitosamente
        setMessage('');
        inputRef.current?.focus();
    };

    return (
        <div className="p-4 border-t border-surface-border bg-background-dark">
            <div className="relative flex items-center gap-2">
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-[20px]">sentiment_satisfied</span>
                </div>
                <input
                    ref={inputRef}
                    className="w-full bg-surface-dark border border-surface-border rounded-lg pl-10 pr-32 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-all shadow-sm"
                    placeholder="Enviar un mensaje"
                    type="text"
                    id="chat-message-input"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isSending) {
                            handleSendMessage();
                        }
                    }}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                        className="bg-primary hover:bg-blue-600 active:scale-95 active:bg-blue-700 text-white rounded-md px-4 py-1.5 text-sm font-bold shadow-lg shadow-blue-900/20 transition-all duration-200 flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
                        onClick={handleSendMessage}
                        disabled={isSending}
                    >
                        Enviar <span className="material-symbols-outlined text-[16px]">send</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatInput;

