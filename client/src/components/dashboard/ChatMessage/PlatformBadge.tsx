import React from 'react';
import type { IconType } from 'react-icons';

interface PlatformBadgeProps {
    Icon: IconType;
    color: string;
}

const PlatformBadge: React.FC<PlatformBadgeProps> = ({ Icon, color }) => {
    return (
        <div className={`${color} rounded-md p-1 flex items-center justify-center`}>
            <Icon className="text-white text-[12px] block" />
        </div>
    );
};

export default PlatformBadge;
