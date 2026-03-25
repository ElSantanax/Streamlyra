import { useMemo, memo, useCallback } from 'react';
import { FaPlus } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import type { PlatformKey } from '../../../../constants/platforms';
import { formatViewers } from '../../../../lib/formatters';
import { ConnectionItem } from '../../connections/ConnectionItem';
import { SidebarSection } from './SidebarSection';
import { useConnectionsStatus, useConnectionsStats } from '../../../../hooks/useConnections';

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
    const { t } = useTranslation();
    const { connectionsStatus, isLoadingConnections, searchStream } = useConnectionsStatus();
    const { connectionsStats } = useConnectionsStats();

    const activePlatforms = useMemo(() => {
        return (Object.keys(connectionsStatus) as PlatformKey[])
            .filter(p => {
                const status = connectionsStatus[p];
                return (
                    status.connected ||
                    status.connectedAt || // Si ha estado conectada antes, está vinculada
                    ['connecting', 'searching', 'error', 'waiting_stream'].includes(status.status || '')
                );
            })
            .sort((a, b) => {
                const statusA = connectionsStatus[a];
                const statusB = connectionsStatus[b];

                const timeA = statusA.connectedAt ? new Date(statusA.connectedAt).getTime() : (statusA.status === 'connecting' ? Number.MAX_SAFE_INTEGER : 0);
                const timeB = statusB.connectedAt ? new Date(statusB.connectedAt).getTime() : (statusB.status === 'connecting' ? Number.MAX_SAFE_INTEGER : 0);

                if (timeA !== timeB) return timeA - timeB;
                return a.localeCompare(b);
            });
    }, [connectionsStatus]);

    return (
        <SidebarSection title={t('dashboard.sidebar.connections.title')}>
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
                    <p className="text-xs text-gray-500">{t('dashboard.sidebar.connections.noPlatforms')}</p>
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
                    <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">{t('dashboard.sidebar.connections.addPlatform')}</span>
                </button>
            )}
        </SidebarSection>
    );
});

SidebarConnections.displayName = 'SidebarConnections';
