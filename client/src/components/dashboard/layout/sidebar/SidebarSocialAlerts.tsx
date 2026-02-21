import { memo } from 'react';
import { FaTwitch, FaTiktok } from 'react-icons/fa';
import { SiKick } from 'react-icons/si';

import type { LastFollower, LastRaid } from '../../../../types';

interface SidebarSocialAlertsProps {
    lastFollower?: LastFollower | null;
    lastRaid?: LastRaid | null;
}

export const SidebarSocialAlerts = memo(({ lastFollower, lastRaid }: SidebarSocialAlertsProps) => {
    if (!lastFollower && !lastRaid) return null;

    return (
        <div className="flex flex-col gap-3">
            {/* Ultimo Seguidor */}
            {lastFollower && (
                <div className="p-4 py-3 rounded-lg bg-surface-dark border border-surface-border flex items-center justify-between gap-3 overflow-hidden">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">Último Seguidor</span>
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                        <span className={`shrink-0 ${lastFollower.platform === 'twitch' ? 'text-[#9146FF]' : lastFollower.platform === 'tiktok' ? 'text-white' : 'text-[#53FC18]'}`}>
                            {lastFollower.platform === 'twitch' && <FaTwitch size={16} />}
                            {lastFollower.platform === 'tiktok' && <FaTiktok size={16} />}
                            {lastFollower.platform === 'kick' && <SiKick size={16} />}
                        </span>
                        <span className={`text-white truncate min-w-0 ${lastFollower.name.length > 18 ? 'text-xs' :
                            lastFollower.name.length > 12 ? 'text-sm' :
                                'text-base'
                            }`} title={lastFollower.name}>
                            {lastFollower.name}
                        </span>
                    </div>
                </div>
            )}

            {/* Ultimo Raid */}
            {lastRaid && (
                <div className="p-4 py-3 rounded-lg bg-surface-dark border border-surface-border flex items-center justify-between gap-3 overflow-hidden">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">Último Raid</span>
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                        <span className={`shrink-0 ${lastRaid.platform === 'twitch' ? 'text-[#9146FF]' : 'text-[#53FC18]'}`}>
                            {lastRaid.platform === 'twitch' && <FaTwitch size={16} />}
                            {lastRaid.platform === 'kick' && <SiKick size={16} />}
                        </span>
                        <span className={`text-white truncate min-w-0 ${lastRaid.name.length > 18 ? 'text-xs' :
                            lastRaid.name.length > 10 ? 'text-sm' :
                                'text-base'
                            }`} title={lastRaid.name}>
                            {lastRaid.name}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
});

SidebarSocialAlerts.displayName = 'SidebarSocialAlerts';
