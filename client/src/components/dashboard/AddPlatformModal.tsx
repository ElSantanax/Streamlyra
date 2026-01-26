import React, { useRef, useEffect, useState } from 'react';
import { MdClose } from 'react-icons/md';
import { PLATFORMS } from '../../constants/platforms';
import PlatformButton from '../connection/PlatformButton';
import PlatformInput from '../connection/PlatformInput';
import { initiateOAuth } from '../../utils/oauth';
import { authService } from '../../api/services';
import { cleanUsername } from '../../lib/validators';

interface AddPlatformModalProps {
    isOpen: boolean;
    onClose: () => void;
    connections?: Record<string, {
        connected: boolean;
        username?: string;
        status?: 'connecting' | 'connected' | 'error';
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
    const modalRef = useRef<HTMLDivElement>(null);
    const [tiktokUsername, setTiktokUsername] = useState('');

    const isTiktokConnected = connections.tiktok?.connected ?? false;
    const tiktokStatus = connections.tiktok?.status;

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
            onClose();
        }
    };

    const handleTiktokConnect = async () => {
        if (!tiktokUsername) return;

        try {
            const cleaned = cleanUsername(tiktokUsername);
            await authService.connectTikTok(cleaned);
            onConnectionSuccess?.();
            setTimeout(() => onClose(), 500);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error al conectar TikTok';
            console.error('Error connecting tiktok:', error);
            alert(message);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                className="relative w-full max-w-md bg-card-dark border border-surface-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-surface-border bg-surface-dark">
                    <h2 className="text-lg font-bold text-white">Agregar Plataforma</h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5 cursor-pointer">
                        <MdClose size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col gap-4">
                    {Object.entries(PLATFORMS)
                        .filter(([key]) => key !== 'system' && key !== 'tiktok')
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
                        onChange={(e) => setTiktokUsername(e.target.value)}
                        onConnect={handleTiktokConnect}
                        isConnected={isTiktokConnected || tiktokStatus === 'connecting'}
                    />
                </div>

            </div>
        </div>
    );
};

export default AddPlatformModal;
