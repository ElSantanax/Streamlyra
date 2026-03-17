import { useMemo, memo } from 'react';
import { MdGroups, MdAccessTime } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { formatViewers } from '../../../../lib/formatters';
import { SimpleTimer } from '../../../common/SimpleTimer';
import { EngagementIndicator } from '../../analytics/EngagementIndicator';
import { SidebarSection } from './SidebarSection';
import { SidebarSocialAlerts } from './SidebarSocialAlerts';
import { useConnectionsStatus, useConnectionsStats } from '../../../../hooks/useConnections';

export const SidebarAnalytics = memo(() => {
    const { t } = useTranslation();
    const { connectionsStatus } = useConnectionsStatus();
    const { connectionsStats, lastFollower, lastRaid } = useConnectionsStats();

    // 1. Calcular espectadores totales (solo de plataformas en vivo)
    const totalViewers = useMemo(() => {
        return Object.keys(connectionsStats).reduce((acc, platform) => {
            // Solo sumar si la plataforma está marcada como en vivo
            if (connectionsStatus[platform]?.isLive) {
                return acc + (connectionsStats[platform].viewers || 0);
            }
            return acc;
        }, 0);
    }, [connectionsStats, connectionsStatus]);

    // 2. Calcular tiempo al aire de forma robusta
    const timerData = useMemo(() => {
        const activePlatforms = Object.keys(connectionsStatus).filter(p => connectionsStatus[p].isLive);
        if (activePlatforms.length === 0) return { sessionStartTime: undefined, latestServerTime: undefined };

        const starts = activePlatforms
            .map(p => connectionsStats[p]?.sessionStartTime)
            .filter((s): s is string => !!s);

        const serverTimes = activePlatforms
            .map(p => connectionsStats[p]?.serverTime)
            .filter((s): s is string => !!s)
            .map(s => new Date(s).getTime())
            .filter(t => !isNaN(t)); // Evitar que NaNs rompan Math.max

        const timestampStarts = starts.map(s => new Date(s).getTime()).filter(t => !isNaN(t));
        const earliestStartTime = timestampStarts.length > 0
            ? new Date(Math.min(...timestampStarts)).toISOString()
            : undefined;

        if (serverTimes.length === 0) {
            return {
                sessionStartTime: earliestStartTime,
                latestServerTime: undefined
            };
        }

        return {
            sessionStartTime: earliestStartTime,
            latestServerTime: new Date(Math.max(...serverTimes)).toISOString()
        };
    }, [connectionsStatus, connectionsStats]);

    return (
        <SidebarSection title={t('dashboard.sidebar.analytics.title')}>
            <div className="grid grid-cols-1 gap-3">
                <div className="min-h-16.5 px-4 py-3 rounded-lg bg-surface-dark border border-surface-border flex items-center justify-between gap-3 box-base transition-colors hover:bg-surface-light group/stat">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">{t('dashboard.sidebar.analytics.totalViewers')}</span>
                    <div className="flex items-center gap-2 text-gray-400">
                        <MdGroups size={20} />
                        <span className="text-base text-white font-bold">{formatViewers(totalViewers)}</span>
                    </div>
                </div>

                <div className="min-h-16.5 px-4 py-3 rounded-lg bg-surface-dark border border-surface-border flex items-center justify-between gap-3 box-base transition-colors hover:bg-surface-light group/stat">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">{t('dashboard.sidebar.analytics.trend')}</span>
                    <EngagementIndicator currentViews={totalViewers} />
                </div>

                <div className="min-h-16.5 px-4 py-3 rounded-lg bg-surface-dark border border-surface-border flex items-center justify-between gap-3 box-base transition-colors hover:bg-surface-light group/stat">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">{t('dashboard.sidebar.analytics.airtime')}</span>
                    <div className="flex items-center gap-2 text-gray-400">
                        <MdAccessTime size={20} />
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
