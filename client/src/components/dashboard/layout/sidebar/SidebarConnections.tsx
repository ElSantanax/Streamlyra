import { useMemo, memo } from 'react';
import { FaPlus } from 'react-icons/fa';
import type { PlatformKey } from '../../../../constants/platforms';
import { formatViewers } from '../../../../lib/formatters';
import { ConnectionItem } from '../../connections/ConnectionItem';
import { SidebarSection } from './SidebarSection';
import { useConnectionsStatus, useConnectionsStats } from '../../../../hooks/useConnectionsContext';

interface SidebarConnectionsProps {
    onAddPlatform?: () => void;
    onDisconnect: (platform: PlatformKey) => void;
    onSearchStream?: (platform: PlatformKey) => void;
}

export const SidebarConnections = memo(({
    onAddPlatform,
    onDisconnect,
    onSearchStream
}: SidebarConnectionsProps) => {
    const { connectionsStatus, searchStream, isLoadingConnections } = useConnectionsStatus();
    const { connectionsStats } = useConnectionsStats();

    const activePlatforms = useMemo(() => {
        return Object.keys(connectionsStatus).filter(p =>
            connectionsStatus[p].connected ||
            ['connecting', 'error', 'waiting_stream'].includes(connectionsStatus[p].status || '')
        );
    }, [connectionsStatus]);

    return (
        <SidebarSection title="Conexiones">
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
            ) : !isLoadingConnections && (
                <div className="p-4 text-center border border-dashed border-surface-border rounded-lg bg-surface-dark/30">
                    <p className="text-xs text-gray-500">No hay plataformas conectadas</p>
                </div>
            )}

            {activePlatforms.length < Object.keys(connectionsStatus).length && (
                <button
                    onClick={onAddPlatform}
                    className="flex items-center gap-3 w-full p-3 rounded-lg bg-surface-dark/50 border border-dashed border-surface-border hover:bg-surface-dark hover:border-primary/50 transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <FaPlus size={14} />
                    </div>
                    <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">Agregar plataforma</span>
                </button>
            )}
        </SidebarSection>
    );
});

SidebarConnections.displayName = 'SidebarConnections';
