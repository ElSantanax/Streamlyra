import type { FC } from 'react';

interface UserBadgeProps {
    type: 'sub' | 'mod' | 'vip' | 'streamer';
    isYouTube?: boolean;
    className?: string;
}

export const UserBadge: FC<UserBadgeProps> = ({ type, isYouTube = false, className = '' }) => {
    const configs = {
        sub: {
            label: isYouTube ? 'Miembro' : 'Sub',
            color: isYouTube
                ? 'bg-[#00E5FF]/10 text-[#00E5FF] dark:bg-[#00E5FF]/15 dark:text-[#00E5FF]'
                : 'bg-[#772CE8]/10 text-[#772CE8] dark:bg-[#A970FF]/15 dark:text-[#A970FF]'
        },
        mod: {
            label: 'MOD',
            color: 'bg-[#00AD03]/10 text-[#00AD03] dark:bg-[#00AD03]/15 dark:text-[#00AD03]'
        },
        vip: {
            label: isYouTube ? 'Verificado' : 'VIP',
            color: 'bg-[#FF4081]/10 text-[#FF4081] dark:bg-[#FF4081]/15 dark:text-[#FF4081]'
        },
        streamer: {
            label: 'Streamer',
            color: 'bg-[#FF0000]/10 text-[#FF0000] dark:bg-[#FF0000]/15 dark:text-[#FF0000]'
        }
    };

    const { label, color } = configs[type];

    return (
        <span
            className={`
                inline-flex items-center
                ${color} 
                text-[10px] md:text-[11px] 
                px-1.5 md:px-2 py-0.75
                rounded-md 
                font-extrabold 
                uppercase 
                tracking-wider
                leading-none
                ${className}
            `}
        >
            {label}
        </span>
    );
};
