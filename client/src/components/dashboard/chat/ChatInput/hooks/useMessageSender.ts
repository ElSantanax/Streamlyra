import { useState, useEffect } from 'react';
import type { User } from '../../../../../types';
import type { SendMessagePayload, MessageSentResult } from '../../../../../types';
import { socket } from '../../../../../services/socket';
import { toast } from '../../../../../lib/notifications/toast';
import { validateMessage } from '../utils/messageValidation';
import { useConnectionsStatus } from '../../../../../hooks/useConnectionsContext';
import { useTranslation } from 'react-i18next';

export const useMessageSender = (
    user: User | null,
    message: string,
    clearMessage: () => void,
    focusInput: () => void
) => {
    const { t } = useTranslation();
    const [isSending, setIsSending] = useState(false);
    const { getConnectedPlatforms } = useConnectionsStatus();


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
                    .map(r => `${r.platform}: ${r.error || t('validation.unknownError', 'Error desconocido')}`)
                    .join(', ');
                toast.warning(t('validation.partialSuccess', { success: successNames, failed: failedDetails }));
            } else {
                const errorDetails = failedPlatforms
                    .map(r => `${r.platform}: ${r.error || t('validation.unknownError', 'Error desconocido')}`)
                    .join(', ');
                toast.error(t('validation.sendError', { details: errorDetails }));
            }
        };

        socket.on('message_sent_result', handleMessageSentResult);

        return () => {
            socket.off('message_sent_result', handleMessageSentResult);
        };
    }, [t]);

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
            toast.error(t('validation.messageEmpty', 'El mensaje no puede estar vacío'));
            return;
        }

        if (!socket.connected) {
            toast.error(t('validation.noServerConnection', 'No hay conexión con el servidor'));
            return;
        }

        if (!user?.id) {
            toast.error(t('validation.unauthenticated', 'Usuario no autenticado'));
            return;
        }

        // Obtener plataformas conectadas usando la función estable
        const connectedPlatforms = getConnectedPlatforms();

        if (connectedPlatforms.length === 0) {
            toast.error(t('validation.noPlatformsConnected', 'No hay plataformas conectadas para enviar el mensaje'));
            return;
        }

        setIsSending(true);
        const messageToSend = message.trim();

        const payload: SendMessagePayload = {
            userId: user.id,
            message: messageToSend,
            platforms: connectedPlatforms
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
