import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useEngagementTrend } from '../../../hooks/useEngagementTrend';
import { FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa';

interface EngagementIndicatorProps {
    currentViews: number;
}

export const EngagementIndicator = memo(({ currentViews }: EngagementIndicatorProps) => {
    const { t } = useTranslation();
    const { trend } = useEngagementTrend(currentViews, 60000, 300000);

    const config = {
        up: {
            color: 'text-green-500',
            icon: <FaArrowUp size={14} />,
            label: t('dashboard.sidebar.analytics.trendUp')
        },
        down: {
            color: 'text-red-500',
            icon: <FaArrowDown size={14} />,
            label: t('dashboard.sidebar.analytics.trendDown')
        },
        stable: {
            color: 'text-blue-400',
            icon: <FaMinus size={14} />,
            label: t('dashboard.sidebar.analytics.trendStable')
        },
        calculating: {
            color: 'text-gray-500',
            icon: <FaMinus size={14} />,
            label: t('dashboard.sidebar.analytics.trendNeutral')
        }
    };

    const currentConfig = config[trend] || config.calculating;

    return (
        <div className={`flex items-center gap-2 ${currentConfig.color}`}>
            <span>{currentConfig.icon}</span>
            <span className="text-[13px]">{currentConfig.label}</span>
        </div>
    );
});

EngagementIndicator.displayName = 'EngagementIndicator';
