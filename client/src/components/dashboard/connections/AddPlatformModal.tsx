import React, { useState } from 'react';
import { PLATFORMS } from '../../../constants/platforms';
import PlatformButton from '../../connection/PlatformButton';
import PlatformInput from '../../connection/PlatformInput';
import { initiateOAuth } from '../../../lib/auth';
import { authService } from '../../../services/api/auth.service';
import { validateTikTokUsername } from '../../../lib/validators';
import { Modal } from '../../ui';
import { toast } from '../../../lib/notifications';
import { getUserFriendlyMessage } from '../../../lib/errors';

interface AddPlatformModalProps {
    isOpen: boolean;
    onClose: () => void;
    connections?: Record<string, {
        connected: boolean;
        username?: string;
        status?: 'connecting' | 'waiting_stream' | 'connected' | 'error' | 'disconnected';
        statusMessage?: string;
    }>;
    onConnectionSuccess?: () => void;
}

const AddPlatformModal: React.FC<AddPlatformModalProps> = ({
    isOpen,
    onClose,
    connections = {},
    onConnectionSuccess
}) => {
    const [tiktokUsername, setTiktokUsername] = useState('');
    const [tiktokError, setTiktokError] = useState<string | undefined>();

    const isTiktokConnected = connections.tiktok?.connected ?? false;
    const tiktokStatus = connections.tiktok?.status;

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
            toast.error(validation.error || 'Nombre de usuario inválido');
            return;
        }

        try {
            await authService.connectTikTok(validation.cleaned!);
            setTiktokError(undefined);
            onConnectionSuccess?.();
            setTimeout(() => onClose(), 500);
        } catch (error) {
            const message = getUserFriendlyMessage(error);
            toast.error(message);
            console.error('Error connecting tiktok:', error);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Agregar Plataforma"
            size="md"
        >
            <div className="flex flex-col gap-4">
                {Object.entries(PLATFORMS)
                    .filter(([key]) => key !== 'system' && key !== 'tiktok' && key !== 'dashboard')
                    .map(([key, platform]) => {
                        const conn = connections[key];
                        const isConnected = !!conn?.connected;
                        const status = conn?.status;

                        let label = isConnected ? `${platform.name} Conectado` : `Conectar ${platform.name}`;
                        if (status === 'connecting') label = `Conectando ${platform.name}...`;
                        if (status === 'error') label = `Error en ${platform.name}`;

                        return (
                            <PlatformButton
                                key={key}
                                label={label}
                                subtext={isConnected ? "Cuenta vinculada exitosamente" : `Vincula tu cuenta de ${platform.name}`}
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
                        <span className="px-2 bg-card-dark text-xs text-gray-500 uppercase font-medium tracking-wider">O agrega usuario</span>
                    </div>
                </div>

                <PlatformInput
                    id="tiktok-username"
                    label="TikTok"
                    placeholder="@usuario"
                    Icon={PLATFORMS.tiktok.Icon}
                    iconColor={PLATFORMS.tiktok.brandColor}
                    value={tiktokUsername}
                    onChange={handleTiktokUsernameChange}
                    onConnect={handleTiktokConnect}
                    isConnected={isTiktokConnected || tiktokStatus === 'connecting'}
                    error={tiktokError}
                    helperText="Usa tu @usuario (no tu nombre visible)"
                />
            </div>
        </Modal>
    );
};

export default AddPlatformModal;
