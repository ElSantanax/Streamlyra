import { memo } from 'react';
import { MdDeleteOutline, MdOutlineVisibility, MdSearch } from 'react-icons/md';
import { PLATFORMS } from '../../../constants/platforms';
import type { PlatformKey } from '../../../constants/platforms';
import Spinner from '../../common/Spinner';
import { dialog } from '../../../lib/dialog';

export interface ConnectionItemProps {
    platformKey: PlatformKey;
    status: 'connected' | 'disconnected' | 'connecting' | 'waiting_stream' | 'error';
    viewers?: string;
    statusMessage?: string;
    isLive?: boolean;
    onDisconnect?: () => void;
    onSearchStream?: () => void;
}

export const ConnectionItem = memo(({
    platformKey,
    status,
    viewers,
    statusMessage,
    isLive,
    onDisconnect,
    onSearchStream
}: ConnectionItemProps) => {
    const { name, Icon, color, iconColor } = PLATFORMS[platformKey];
    const isConnected = status === 'connected';
    const isConnecting = status === 'connecting';
    const isError = status === 'error';
    const isWaitingStream = status === 'waiting_stream';
    const isYouTube = platformKey === 'youtube';
    const isTikTok = platformKey === 'tiktok';
    const showSearchButton = (isYouTube || isTikTok) && isWaitingStream;

    return (
        <div className={`flex items-center justify-between p-3 rounded-lg bg-surface-dark border border-surface-border ${!isConnected && !isConnecting && !isWaitingStream ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center size-8 rounded-full ${color} ${iconColor}`}>
                    <Icon size={platformKey === 'tiktok' ? 14 : 16} />
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold leading-none">{name}</span>
                        {isConnecting && <Spinner size="xs" />}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                        {isConnecting ? (
                            <span className="text-xs text-blue-400">Buscando...</span>
                        ) : isWaitingStream ? (
                            <span className="text-xs text-yellow-400">Esperando stream...</span>
                        ) : isError ? (
                            <span className="text-xs text-yellow-400">{statusMessage || 'Error'}</span>
                        ) : isConnected ? (
                            <>
                                {isLive ? (
                                    <div className="flex items-center gap-1.5">
                                        <div className="size-1.5 rounded-full bg-green-400 animate-pulse"></div>
                                        <span className="text-xs text-green-400">En Vivo</span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-green-400">Conectado</span>
                                )}
                                {viewers && (
                                    <>
                                        <span className="text-[10px] text-gray-600">•</span>
                                        <div className="flex items-center gap-1 text-gray-400">
                                            <MdOutlineVisibility size={12} />
                                            <span className="text-xs">{viewers}</span>
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <span className="text-xs text-red-400">Desconectado</span>
                        )}
                    </div>
                </div>
            </div>
            {(isConnected || isConnecting || isError || isWaitingStream) ? (
                <div className="flex items-center gap-1">
                    {/* Botón de búsqueda manual para YouTube y TikTok cuando está esperando */}
                    {showSearchButton && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSearchStream?.();
                            }}
                            className="flex items-center justify-center p-1.5 hover:bg-blue-500/10 text-gray-500 hover:text-blue-500 rounded-lg transition-all duration-200 cursor-pointer"
                            title="Buscar stream ahora"
                        >
                            <MdSearch size={18} />
                        </button>
                    )}
                    <button
                        onClick={async (e) => {
                            e.stopPropagation();
                            const action = isConnecting || isWaitingStream ? 'cancelar' : 'desconectar';
                            const confirmed = await dialog.warning(
                                `¿Estás seguro de ${action} ${name}?`,
                                {
                                    title: `Confirmar ${action}`
                                }
                            );
                            if (confirmed) {
                                onDisconnect?.();
                            }
                        }}
                        className="flex items-center justify-center p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-lg transition-all duration-200 cursor-pointer"
                        title={isConnecting || isWaitingStream ? "Cancelar conexión" : "Desconectar"}
                    >
                        <MdDeleteOutline size={18} />
                    </button>
                </div>
            ) : (
                <div className="size-2 rounded-full bg-red-500"></div>
            )}
        </div>
    );
});

ConnectionItem.displayName = 'ConnectionItem';
