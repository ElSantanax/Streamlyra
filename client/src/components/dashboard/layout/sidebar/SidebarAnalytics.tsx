import { useMemo, memo } from 'react';
import { MdGroups, MdAccessTime } from 'react-icons/md';
import { formatViewers } from '../../../../lib/formatters';
import { SimpleTimer } from '../../../common/SimpleTimer';
import { EngagementIndicator } from '../../analytics/EngagementIndicator';
import { SidebarSection } from './SidebarSection';
import { SidebarSocialAlerts } from './SidebarSocialAlerts';
import { useConnectionsStatus, useConnectionsStats } from '../../../../hooks/useConnectionsContext';

export const SidebarAnalytics = memo(() => {
    const { connectionsStatus } = useConnectionsStatus();
    const { connectionsStats, lastFollower, lastRaid } = useConnectionsStats();

    // 1. Calcular espectadores totales
    const totalViewers = useMemo(
        () => Object.values(connectionsStats).reduce((acc, curr: { viewers?: number }) => acc + (curr.viewers || 0), 0),
        [connectionsStats]
    );

    // 2. Calcular tiempo al aire
    const timerData = useMemo(() => {
        const activePlatforms = Object.keys(connectionsStatus).filter(p => connectionsStatus[p].isLive);
        if (activePlatforms.length === 0) return { sessionStartTime: undefined, latestServerTime: undefined };

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

    return (
        <SidebarSection title="Analíticas en Vivo">
            <div className="grid grid-cols-1 gap-3">
                <div className="p-4 py-3 rounded-lg bg-surface-dark border border-surface-border flex items-center justify-between gap-3 box-base transition-colors hover:bg-surface-light group/stat">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">Espectadores Totales</span>
                    <div className="flex items-center gap-2 text-gray-400">
                        <MdGroups size={18} />
                        <span className="text-base text-white font-bold">{formatViewers(totalViewers)}</span>
                    </div>
                </div>

                <div className="p-4 py-3 rounded-lg bg-surface-dark border border-surface-border flex items-center justify-between gap-3 box-base transition-colors hover:bg-surface-light group/stat">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">Tendencia</span>
                    <EngagementIndicator currentViews={totalViewers} />
                </div>

                <div className="p-4 py-3 rounded-lg bg-surface-dark border border-surface-border flex items-center justify-between gap-3 box-base transition-colors hover:bg-surface-light group/stat">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">Tiempo al Aire</span>
                    <div className="flex items-center gap-2 text-gray-400">
                        <MdAccessTime size={18} />
                        <span className="text-base text-white font-mono font-bold">
                            {timerData.sessionStartTime ? (
                                <SimpleTimer startTime={timerData.sessionStartTime} serverTime={timerData.latestServerTime} />
                            ) : (
                                "00:00:00"
                            )}
                        </span>
                    </div>
                </div>
            </div>

            <SidebarSocialAlerts lastFollower={lastFollower} lastRaid={lastRaid} />
        </SidebarSection>
    );
});

SidebarAnalytics.displayName = 'SidebarAnalytics';
