import { useMemo } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import { MdDeleteSweep } from 'react-icons/md';
import type { PlatformKey } from '../../../constants/platforms';
import { formatViewers } from '../../../lib/formatters';
import { ConnectionItem } from '../connections/ConnectionItem';

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
    onClearChat?: () => void;
}

const Sidebar = ({ onMobileClose, onAddPlatform, connections, onDisconnect, onSearchStream, onClearChat }: SidebarProps) => {
    // Calcular espectadores totales
    const totalViewers = useMemo(
        () => Object.values(connections).reduce((acc, curr) => acc + (curr.viewers || 0), 0),
        [connections]
    );

    // Filtrar conexiones activas o en proceso para mostrar
    // Esto optimiza el renderizado evitando hacer filter dos veces en el JSX
    const activeConnections = useMemo(() => {
        return Object.entries(connections).filter(([, data]) =>
            data.connected ||
            data.status === 'connecting' ||
            data.status === 'error' ||
            data.status === 'waiting_stream'
        );
    }, [connections]);

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

                {activeConnections.length > 0 ? (
                    activeConnections.map(([key, data]) => {
                        // Mapear el estado interno al estado del componente
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
                    <button 
                        onClick={onClearChat}
                        className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <MdDeleteSweep size={20} /> Limpiar Chat
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
