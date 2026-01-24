import React, { useRef, useEffect, useState } from 'react';
import { MdClose } from 'react-icons/md';
import { PLATFORMS } from '../../constants/platforms';
import PlatformButton from '../connection/PlatformButton';
import PlatformInput from '../connection/PlatformInput';
import { generatePKCE } from '../../utils/pkce';

interface AddPlatformModalProps {
    isOpen: boolean;
    onClose: () => void;
    connections?: Record<string, { connected: boolean; username?: string }>;
}

const AddPlatformModal: React.FC<AddPlatformModalProps> = ({
    isOpen,
    onClose,
    connections = {
        twitch: { connected: false },
        youtube: { connected: false },
        tiktok: { connected: false },
        kick: { connected: false }
    }
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const [tiktokUsername, setTiktokUsername] = useState('');
    const [isTiktokConnected, setIsTiktokConnected] = useState(connections?.tiktok?.connected ?? false);

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

    const handleTiktokConnect = () => {
        if (!tiktokUsername) return;
        // Simulamos la conexión visualmente
        setIsTiktokConnected(true);
        console.log(`Conectando tiktok user: ${tiktokUsername}`);
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
                            const isConnected = !!connections[key]?.connected;

                            const handleConnect = () => {
                                if (isConnected) return;

                                const redirectUri = `${window.location.origin}/auth/callback`;

                                if (key === 'twitch') {
                                    const clientId = import.meta.env.VITE_TWITCH_CLIENT_ID as string;
                                    if (!clientId) {
                                        alert('Falta VITE_TWITCH_CLIENT_ID en .env');
                                        return;
                                    }
                                    const scope = 'chat:read chat:edit user:read:email';
                                    window.location.href = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=twitch`;
                                }

                                if (key === 'youtube') {
                                    const clientId = import.meta.env.VITE_YOUTUBE_CLIENT_ID as string;
                                    if (!clientId) {
                                        alert('Falta VITE_YOUTUBE_CLIENT_ID en .env');
                                        return;
                                    }
                                    const scope = 'https://www.googleapis.com/auth/youtube.readonly email profile';
                                    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=youtube`;
                                }

                                if (key === 'kick') {
                                    const clientId = import.meta.env.VITE_KICK_CLIENT_ID as string;
                                    if (!clientId) {
                                        alert('Falta VITE_KICK_CLIENT_ID en .env');
                                        return;
                                    }

                                    // Generar PKCE para Kick (Requerido para OAuth 2.1)
                                    generatePKCE().then(({ verifier, challenge }) => {
                                        localStorage.setItem('kick_verifier', verifier);

                                        const state = 'kick';
                                        const scope = 'user:read channel:read chat:write events:subscribe';
                                        const authUrl = `https://id.kick.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;

                                        window.location.href = authUrl;
                                    });
                                }
                            };

                            return (
                                <PlatformButton
                                    key={key}
                                    label={isConnected ? `${platform.name} Conectado` : `Conectar ${platform.name}`}
                                    subtext={isConnected ? "Cuenta vinculada exitosamente" : `Vincula tu cuenta de ${platform.name}`}
                                    Icon={platform.Icon}
                                    iconColor={platform.brandColor}
                                    onClick={handleConnect}
                                    isConnected={isConnected}
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
                        isConnected={isTiktokConnected}
                    />
                </div>

            </div>
        </div>
    );
};

export default AddPlatformModal;
