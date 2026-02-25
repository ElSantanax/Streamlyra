import { useMemo, memo, useCallback } from 'react';
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

const ConnectedPlatformItem = memo(({
    platformKey,
    isConnected,
    isLive,
    viewers,
    statusMessage,
    platformStatus,
    onDisconnect,
    onSearchStream,
    searchStream
}: {
    platformKey: PlatformKey,
    isConnected: boolean,
    isLive: boolean,
    viewers?: number,
    statusMessage?: string,
    platformStatus?: string,
    onDisconnect: (p: PlatformKey) => void,
    onSearchStream?: (p: PlatformKey) => void,
    searchStream: (p: PlatformKey) => void
}) => {
    // Callbacks estables
    const handleDisconnect = useCallback(() => {
        onDisconnect(platformKey);
    }, [onDisconnect, platformKey]);

    const handleSearch = useCallback(() => {
        (onSearchStream || searchStream)?.(platformKey);
    }, [onSearchStream, searchStream, platformKey]);

    return (
        <ConnectionItem
            platformKey={platformKey}
            status={(platformStatus || (isConnected ? 'connected' : 'disconnected')) as 'connected' | 'disconnected' | 'connecting' | 'waiting_stream' | 'error'}
            viewers={viewers !== undefined ? formatViewers(viewers) : undefined}
            statusMessage={statusMessage}
            isLive={isLive}
            onDisconnect={handleDisconnect}
            onSearchStream={handleSearch}
        />
    );
});

ConnectedPlatformItem.displayName = 'ConnectedPlatformItem';

export const SidebarConnections = memo(({
    onAddPlatform,
    onDisconnect,
    onSearchStream
}: SidebarConnectionsProps) => {
    // Consumimos ambos contextos aquí
    const { connectionsStatus, isLoadingConnections, searchStream } = useConnectionsStatus();
    const { connectionsStats } = useConnectionsStats();

    const activePlatforms = useMemo(() => {
        return Object.keys(connectionsStatus).filter(p =>
            connectionsStatus[p].connected ||
            ['connecting', 'error', 'waiting_stream'].includes(connectionsStatus[p].status || '')
        ) as PlatformKey[];
    }, [connectionsStatus]);

    return (
        <SidebarSection title="Conexiones">
            {activePlatforms.length > 0 ? (
                activePlatforms.map((key) => {
                    const status = connectionsStatus[key];
                    const stats = connectionsStats[key];

                    return (
                        <ConnectedPlatformItem
                            key={key}
                            platformKey={key}
                            isConnected={status.connected}
                            isLive={status.isLive || false}
                            viewers={stats?.viewers}
                            statusMessage={status.statusMessage}
                            platformStatus={status.status}
                            onDisconnect={onDisconnect}
                            onSearchStream={onSearchStream}
                            searchStream={searchStream}
                        />
                    );
                })
            ) : !isLoadingConnections && (
                <div className="min-h-16.5 px-4 flex items-center justify-center border border-dashed border-surface-border rounded-lg bg-surface-dark/30">
                    <p className="text-xs text-gray-500">No hay plataformas conectadas</p>
                </div>
            )}

            {!isLoadingConnections && activePlatforms.length < Object.keys(connectionsStatus).length && (
                <button
                    onClick={onAddPlatform}
                    className="flex items-center gap-3 w-full min-h-16.5 px-4 py-2.5 rounded-lg bg-surface-dark/50 border border-dashed border-surface-border hover:bg-surface-dark hover:border-primary/50 transition-all cursor-pointer group active:scale-[0.98]"
                >
                    <div className="flex items-center justify-center size-7 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <FaPlus size={12} />
                    </div>
                    <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">Agregar plataforma</span>
                </button>
            )}
        </SidebarSection>
    );
});

SidebarConnections.displayName = 'SidebarConnections';
