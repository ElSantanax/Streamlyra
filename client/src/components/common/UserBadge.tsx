import type { FC } from 'react';
import { FaCrown, FaShieldAlt, FaGem, FaStar, FaCheckCircle } from 'react-icons/fa';

interface UserBadgeProps {
    type: 'sub' | 'mod' | 'vip' | 'streamer';
    isYouTube?: boolean;
    className?: string;
}

export const UserBadge: FC<UserBadgeProps> = ({ type, isYouTube = false, className = '' }) => {
    const configs = {
        sub: {
            label: isYouTube ? 'Miembro' : 'Sub',
            Icon: FaStar,
            color: isYouTube
                ? 'bg-[#00E5FF]/10 text-[#00E5FF] dark:bg-[#00E5FF]/15 dark:text-[#00E5FF]'
                : 'bg-[#772CE8]/10 text-[#772CE8] dark:bg-[#A970FF]/15 dark:text-[#A970FF]'
        },
        mod: {
            label: 'MOD',
            Icon: FaShieldAlt,
            color: 'bg-[#00AD03]/10 text-[#00AD03] dark:bg-[#00AD03]/15 dark:text-[#00AD03]'
        },
        vip: {
            label: isYouTube ? 'Verificado' : 'VIP',
            Icon: isYouTube ? FaCheckCircle : FaGem,
            color: 'bg-[#FF4081]/10 text-[#FF4081] dark:bg-[#FF4081]/15 dark:text-[#FF4081]'
        },
        streamer: {
            label: 'Streamer',
            Icon: FaCrown,
            color: 'bg-[#FF0000]/10 text-[#FF0000] dark:bg-[#FF0000]/15 dark:text-[#FF0000]'
        }
    };

    const { label, color, Icon } = configs[type];

    return (
        <span
            title={label}
            className={`
                inline-flex items-center justify-center
                ${color} 
                p-0.5 md:p-1
                rounded-md 
                shadow-sm
                ring-1 ring-inset ring-white/10
                ${className}
            `}
        >
            <Icon className="size-3 md:size-3.5" />
        </span>
    );
};
