import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PLATFORMS } from '../../../constants/platforms';
import PlatformButton from '../../connection/PlatformButton';
import PlatformInput from '../../connection/PlatformInput';
import { initiateOAuth } from '../../../lib/auth';
import { authService } from '../../../services/api/auth.service';
import { validateTikTokUsername } from '../../../lib/validators';
import { Modal } from '../../ui';
import { toast } from '../../../lib/notifications';
import { getUserFriendlyMessage } from '../../../lib/errors';
import { useConnectionsStatus } from '../../../hooks/useConnections';
import { useConnectionsStore } from '../../../store/useConnectionsStore';

interface AddPlatformModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConnectionSuccess?: () => void;
}

const AddPlatformModal: React.FC<AddPlatformModalProps> = ({
    isOpen,
    onClose,
    onConnectionSuccess
}) => {
    const { t } = useTranslation();
    const { connectionsStatus: connections = {} } = useConnectionsStatus();
    const updatePlatformStatus = useConnectionsStore(state => state.updateStatus);

    const [tiktokUsername, setTiktokUsername] = useState('');
    const [tiktokError, setTiktokError] = useState<string | undefined>();

    const isTiktokConnected = connections.tiktok?.connected ?? false;
    const tiktokStatus = connections.tiktok?.status;

    // Sincronizar el nombre de usuario de TikTok si ya está conectado
    React.useEffect(() => {
        if (isTiktokConnected && connections.tiktok?.username && !tiktokUsername) {
            setTiktokUsername(connections.tiktok.username);
        }
    }, [isTiktokConnected, connections.tiktok?.username, tiktokUsername]);

    const handleTiktokUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setTiktokUsername(value);

        // Validar en tiempo real
        if (value.trim()) {
            const validation = validateTikTokUsername(value);
            setTiktokError(validation.error);
        } else {
            setTiktokError(undefined);
        }
    };

    const handleTiktokConnect = async () => {
        if (!tiktokUsername) return;

        // Validar antes de enviar
        const validation = validateTikTokUsername(tiktokUsername);

        if (!validation.isValid) {
            setTiktokError(validation.error);
            toast.error(validation.error || t('dashboard.addPlatformModal.invalidUsername'));
            return;
        }

        try {
            // Feedback inmediato de conexión
            updatePlatformStatus('tiktok', { status: 'connecting' });

            await authService.connectTikTok(validation.cleaned!);
            setTiktokError(undefined);
            onConnectionSuccess?.();
            setTimeout(() => onClose(), 500);
        } catch (error) {
            // Revertir estado en caso de error
            updatePlatformStatus('tiktok', { status: 'error' });
            const message = getUserFriendlyMessage(error);
            setTiktokError(message);
            toast.error(message);
            console.error('Error connecting tiktok:', error);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('dashboard.addPlatformModal.title')}
            size="md"
        >
            <div className="flex flex-col gap-4">
                {Object.entries(PLATFORMS)
                    .filter(([key]) => key !== 'system' && key !== 'tiktok' && key !== 'dashboard')
                    .map(([key, platform]) => {
                        const conn = connections[key];
                        const isConnected = !!conn?.connected;
                        const status = conn?.status;

                        let label = isConnected ? t('dashboard.addPlatformModal.connected', { platform: platform.name }) : t('dashboard.addPlatformModal.connect', { platform: platform.name });
                        if (status === 'connecting') label = t('dashboard.addPlatformModal.connecting', { platform: platform.name });
                        if (status === 'error') label = t('dashboard.addPlatformModal.errorIn', { platform: platform.name });

                        return (
                            <PlatformButton
                                key={key}
                                label={label}
                                subtext={isConnected ? t('dashboard.addPlatformModal.linkedSuccessfully') : t('dashboard.addPlatformModal.linkYourAccount', { platform: platform.name })}
                                Icon={platform.Icon}
                                iconColor={platform.brandColor}
                                onClick={() => !isConnected && initiateOAuth(key as 'twitch' | 'youtube' | 'kick')}
                                isConnected={isConnected || status === 'connecting'}
                                className="bg-surface-dark hover:bg-surface-dark/80"
                            />
                        );
                    })}

                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-surface-border"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <span className="px-2 bg-card-dark text-xs text-gray-500 uppercase font-medium tracking-wider">{t('dashboard.addPlatformModal.orAddUser')}</span>
                    </div>
                </div>

                <PlatformInput
                    id="tiktok-username"
                    label="TikTok"
                    placeholder={t('dashboard.addPlatformModal.tiktokPlaceholder')}
                    Icon={PLATFORMS.tiktok.Icon}
                    iconColor={PLATFORMS.tiktok.brandColor}
                    value={tiktokUsername}
                    onChange={handleTiktokUsernameChange}
                    onConnect={handleTiktokConnect}
                    isConnected={isTiktokConnected || tiktokStatus === 'connecting'}
                    error={tiktokError}
                    helperText={t('dashboard.addPlatformModal.tiktokHelper')}
                />
            </div>
        </Modal>
    );
};

export default AddPlatformModal;
