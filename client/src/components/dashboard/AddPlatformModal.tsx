import React, { useRef, useEffect, useState } from 'react';
import { MdClose } from 'react-icons/md';
import { PLATFORMS } from '../../constants/platforms';
import PlatformButton from '../connection/PlatformButton';
import PlatformInput from '../connection/PlatformInput';

interface AddPlatformModalProps {
    isOpen: boolean;
    onClose: () => void;
    connections?: {
        twitch: boolean;
        youtube: boolean;
        kick: boolean;
        tiktok: boolean;
    };
}

const AddPlatformModal: React.FC<AddPlatformModalProps> = ({
    isOpen,
    onClose,
    connections = {
        twitch: true,
        youtube: true,
        tiktok: false,
        kick: false
    }
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const [tiktokUsername, setTiktokUsername] = useState('');
    const [isTiktokConnected, setIsTiktokConnected] = useState(connections?.tiktok ?? false);

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
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5 cursor-pointer"
                    >
                        <MdClose size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col gap-4">
                    <PlatformButton
                        label={connections.twitch ? "Twitch Conectado" : "Conectar Twitch"}
                        subtext={connections.twitch ? "Cuenta vinculada exitosamente" : "Vincula tu cuenta de streaming"}
                        Icon={PLATFORMS.twitch.Icon}
                        iconColor={PLATFORMS.twitch.brandColor}
                        onClick={() => !connections.twitch && {}}
                        isConnected={connections.twitch}
                        className="bg-surface-dark hover:bg-surface-dark/80"
                    />
                    <PlatformButton
                        label={connections.youtube ? "YouTube Conectado" : "Conectar YouTube"}
                        subtext={connections.youtube ? "Canal vinculado exitosamente" : "Vincula tu canal de YouTube"}
                        Icon={PLATFORMS.youtube.Icon}
                        iconColor={PLATFORMS.youtube.brandColor}
                        onClick={() => !connections.youtube && {}}
                        isConnected={connections.youtube}
                        className="bg-surface-dark hover:bg-surface-dark/80"
                    />
                    <PlatformButton
                        label={connections.kick ? "Kick Conectado" : "Conectar Kick"}
                        subtext={connections.kick ? "Cuenta vinculada exitosamente" : "Vincula tu cuenta de Kick"}
                        Icon={PLATFORMS.kick.Icon}
                        iconColor={PLATFORMS.kick.brandColor}
                        onClick={() => !connections.kick && {}}
                        isConnected={connections.kick}
                        className="bg-surface-dark hover:bg-surface-dark/80"
                    />

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
