import { useMemo, memo } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import { MdDeleteSweep } from 'react-icons/md';
import type { PlatformKey } from '../../../constants/platforms';
import { formatViewers } from '../../../lib/formatters';
import { ConnectionItem } from '../connections/ConnectionItem';
import { SimpleTimer } from '../../common/SimpleTimer';
import { useConnectionsStatus, useConnectionsStats } from '../../../hooks/useConnectionsContext';

interface SidebarProps {
    onMobileClose?: () => void;
    onAddPlatform?: () => void;
    onDisconnect: (platform: PlatformKey) => void;
    onSearchStream?: (platform: PlatformKey) => void;
    onClearChat?: () => void;
}

const Sidebar = memo(({ onMobileClose, onAddPlatform, onDisconnect, onSearchStream, onClearChat }: SidebarProps) => {
    const { connectionsStatus, searchStream } = useConnectionsStatus();
    const { connectionsStats } = useConnectionsStats();

    // 1. Calcular espectadores totales (Solo depende de stats)
    const totalViewers = useMemo(
        () => Object.values(connectionsStats).reduce((acc, curr) => acc + (curr.viewers || 0), 0),
        [connectionsStats]
    );

    // 2. Calcular tiempo al aire (Depende de status para saber qué stats mirar)
    const timerData = useMemo(() => {
        const activePlatforms = Object.keys(connectionsStatus).filter(p => connectionsStatus[p].isLive);
        if (activePlatforms.length === 0) return { sessionStartTime: undefined, latestServerTime: undefined };

        // Buscar el inicio de sesión más antiguo de las plataformas activas
        const starts = activePlatforms
            .map(p => connectionsStats[p]?.sessionStartTime)
            .filter((s): s is string => !!s);

        const serverTimes = activePlatforms
            .map(p => connectionsStats[p]?.serverTime)
            .filter((s): s is string => !!s)
            .map(s => new Date(s).getTime());

        return {
            sessionStartTime: starts.length > 0 ? starts[0] : undefined,
            latestServerTime: serverTimes.length > 0 ? new Date(Math.max(...serverTimes)).toISOString() : undefined
        };
    }, [connectionsStatus, connectionsStats]);

    // 3. Filtrar conexiones activas (Solo depende de Status)
    const activePlatforms = useMemo(() => {
        return Object.keys(connectionsStatus).filter(p =>
            connectionsStatus[p].connected ||
            ['connecting', 'error', 'waiting_stream'].includes(connectionsStatus[p].status || '')
        );
    }, [connectionsStatus]);

    return (
        <aside className="flex h-full w-full flex-col border-r border-surface-border bg-background-dark p-4 gap-6 overflow-y-auto custom-scrollbar">
            {/* Mobile Header */}
            <div className="flex items-center justify-between lg:hidden mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-white">Menú de Control</span>
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

                {activePlatforms.length > 0 ? (
                    activePlatforms.map((key) => {
                        const s = connectionsStatus[key];
                        const st = connectionsStats[key];

                        return (
                            <ConnectionItem
                                key={key}
                                platformKey={key as PlatformKey}
                                status={s.status || (s.connected ? 'connected' : 'disconnected')}
                                viewers={st.viewers !== undefined ? formatViewers(st.viewers) : undefined}
                                statusMessage={s.statusMessage}
                                isLive={s.isLive}
                                onDisconnect={() => onDisconnect(key as PlatformKey)}
                                onSearchStream={() => (onSearchStream || searchStream)?.(key as PlatformKey)}
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
                        <span className="text-base font-black text-white">
                            {timerData.sessionStartTime ? (
                                <SimpleTimer startTime={timerData.sessionStartTime} serverTime={timerData.latestServerTime} />
                            ) : (
                                "00:00:00"
                            )}
                        </span>
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
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;

