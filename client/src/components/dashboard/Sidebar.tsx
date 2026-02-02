import { useMemo } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import { MdDeleteOutline, MdOutlineVisibility, MdDeleteSweep, MdSearch } from 'react-icons/md';
import { PLATFORMS } from '../../constants/platforms';
import type { PlatformKey } from '../../constants/platforms';
import Spinner from '../common/Spinner';
import { formatViewers } from '../../lib/formatters';

interface ConnectionItemProps {
    platformKey: PlatformKey;
    status: 'connected' | 'disconnected' | 'connecting' | 'waiting_stream' | 'error';
    viewers?: string;
    statusMessage?: string;
    onDisconnect?: () => void;
    onSearchStream?: () => void;
}

const ConnectionItem = ({
    platformKey,
    status,
    viewers,
    statusMessage,
    onDisconnect,
    onSearchStream
}: ConnectionItemProps) => {
    const { name, Icon, color, iconColor } = PLATFORMS[platformKey];
    const isConnected = status === 'connected';
    const isConnecting = status === 'connecting';
    const isError = status === 'error';
    const isWaitingStream = status === 'waiting_stream';
    const isYouTube = platformKey === 'youtube';

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
                                <span className="text-xs text-green-400">Conectado</span>
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
                    {/* Botón de búsqueda manual para YouTube cuando está esperando */}
                    {isYouTube && isWaitingStream && (
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
                        onClick={(e) => {
                            e.stopPropagation();
                            const action = isConnecting || isWaitingStream ? 'cancelar' : 'desconectar';
                            if (window.confirm(`¿Estás seguro de ${action} ${name}?`)) {
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
};

interface SidebarProps {
    onMobileClose?: () => void;
    onAddPlatform?: () => void;
    connections: Record<string, {
        connected: boolean;
        username?: string;
        viewers?: number;
        status?: 'connecting' | 'waiting_stream' | 'connected' | 'error' | 'disconnected';
        statusMessage?: string;
    }>;
    onDisconnect: (platform: PlatformKey) => void;
    onSearchStream?: (platform: PlatformKey) => void;
}

const Sidebar = ({ onMobileClose, onAddPlatform, connections, onDisconnect, onSearchStream }: SidebarProps) => {
    const totalViewers = useMemo(
        () => Object.values(connections).reduce((acc, curr) => acc + (curr.viewers || 0), 0),
        [connections]
    );

    return (
        <aside className="flex h-full w-full flex-col border-r border-surface-border bg-background-dark p-4 gap-6 overflow-y-auto custom-scrollbar">
            {/* Mobile Header */}
            <div className="flex items-center justify-between lg:hidden mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Menú de Control</span>
                <button
                    onClick={onMobileClose}
                    className="p-2 text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                    <FaTimes size={18} />
                </button>
            </div>

            {/* Conexiones */}
            <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Conexiones</h3>
                {Object.entries(connections).filter(([, data]) => data.connected || data.status === 'connecting' || data.status === 'error' || data.status === 'waiting_stream').length > 0 ? (
                    Object.entries(connections)
                        .filter(([, data]) => data.connected || data.status === 'connecting' || data.status === 'error' || data.status === 'waiting_stream')
                        .map(([key, data]) => {
                            const status = data.status === 'connecting'
                                ? 'connecting'
                                : data.status === 'waiting_stream'
                                    ? 'waiting_stream'
                                    : data.status === 'error'
                                        ? 'error'
                                        : data.connected
                                            ? 'connected'
                                            : 'disconnected';

                            return (
                                <ConnectionItem
                                    key={key}
                                    platformKey={key as PlatformKey}
                                    status={status}
                                    viewers={data.viewers !== undefined ? formatViewers(data.viewers) : undefined}
                                    statusMessage={data.statusMessage}
                                    onDisconnect={() => onDisconnect(key as PlatformKey)}
                                    onSearchStream={() => onSearchStream?.(key as PlatformKey)}
                                />
                            );
                        })
                ) : (
                    <div className="p-4 text-center border border-dashed border-surface-border rounded-lg bg-surface-dark/30">
                        <p className="text-xs text-gray-500">No hay plataformas conectadas</p>
                    </div>
                )}

                <button
                    onClick={onAddPlatform}
                    className="flex items-center gap-3 w-full p-3 rounded-lg bg-surface-dark/50 border border-dashed border-surface-border hover:bg-surface-dark hover:border-primary/50 transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <FaPlus size={14} />
                    </div>
                    <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">Agregar plataforma</span>
                </button>
            </div>

            {/* Analíticas */}
            <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Analíticas en Vivo</h3>
                <div className="grid grid-cols-1 gap-3">
                    <div className="p-4 py-3 rounded-lg bg-surface-dark border border-surface-border flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Espectadores Totales</span>
                        <span className="text-base font-black text-white">{formatViewers(totalViewers)}</span>
                    </div>
                    <div className="p-4 py-3 rounded-lg bg-surface-dark border border-surface-border flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tiempo al Aire</span>
                        <span className="text-base font-black text-white">00h 00m 00s</span>
                    </div>
                </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="flex flex-col gap-3 mt-auto">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Acciones Rápidas</h3>
                <div className="flex flex-col gap-2">
                    <button className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer">
                        <MdDeleteSweep size={20} /> Limpiar Chat
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
