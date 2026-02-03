import { useState, useEffect } from 'react';
import type { User } from '../../../../types';
import type { SendMessagePayload, MessageSentResult } from '../../../../types';
import { socket } from '../../../../services/socket';
import { toast } from '../../../../lib/notifications/toast';
import { validateMessage } from '../utils/messageValidation';

export const useMessageSender = (
    user: User | null,
    message: string,
    clearMessage: () => void,
    focusInput: () => void
) => {
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        const handleMessageSentResult = (result: MessageSentResult) => {
            setIsSending(false);

            const successfulPlatforms = result.results.filter(r => r.success);
            const failedPlatforms = result.results.filter(r => !r.success);

            if (successfulPlatforms.length === result.results.length) {
                // Éxito total
            } else if (successfulPlatforms.length > 0) {
                const successNames = successfulPlatforms.map(r => r.platform).join(', ');
                const failedDetails = failedPlatforms
                    .map(r => `${r.platform}: ${r.error || 'Error desconocido'}`)
                    .join(', ');
                toast.warning(`Mensaje enviado a ${successNames}. Falló en: ${failedDetails}`);
            } else {
                const errorDetails = failedPlatforms
                    .map(r => `${r.platform}: ${r.error || 'Error desconocido'}`)
                    .join(', ');
                toast.error(`Error al enviar mensaje. ${errorDetails}`);
            }
        };

        socket.on('message_sent_result', handleMessageSentResult);

        return () => {
            socket.off('message_sent_result', handleMessageSentResult);
        };
    }, []);

    useEffect(() => {
        const handleMessageSendError = (error: { code: string; message: string }) => {
            setIsSending(false);
            toast.error(error.message);
        };

        socket.on('message_send_error', handleMessageSendError);

        return () => {
            socket.off('message_send_error', handleMessageSendError);
        };
    }, []);

    const handleSendMessage = () => {
        if (!validateMessage(message)) {
            toast.error('El mensaje no puede estar vacío');
            return;
        }

        if (!socket.connected) {
            toast.error('No hay conexión con el servidor');
            return;
        }

        if (!user?.id) {
            toast.error('Usuario no autenticado');
            return;
        }

        setIsSending(true);
        const messageToSend = message.trim();

        const payload: SendMessagePayload = {
            userId: user.id,
            message: messageToSend,
            platforms: []
        };

        socket.emit('send_message', payload);
        clearMessage();
        focusInput();
    };

    return {
        isSending,
        handleSendMessage
    };
};
