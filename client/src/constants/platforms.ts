import { FaTwitch, FaYoutube, FaTiktok } from 'react-icons/fa';
import { SiKick } from 'react-icons/si';
import { MdInfo, MdSend } from 'react-icons/md';

export const PLATFORMS = {
    twitch: {
        name: 'Twitch',
        Icon: FaTwitch,
        color: 'bg-[#9146FF]',
        textColor: 'text-[#772CE8] dark:text-[#A970FF]',
        iconColor: 'text-white',
        brandColor: '#9146FF'
    },
    youtube: {
        name: 'YouTube',
        Icon: FaYoutube,
        color: 'bg-white',
        textColor: 'text-[#FF0000] dark:text-[#FF0000]',
        iconColor: 'text-[#FF0000]',
        brandColor: '#FF0000'
    },
    tiktok: {
        name: 'TikTok',
        Icon: FaTiktok,
        color: 'bg-black',
        textColor: 'text-[#FF0050] dark:text-[#ff2d6b]',
        iconColor: 'text-white',
        brandColor: '#FF0050'
    },
    kick: {
        name: 'Kick',
        Icon: SiKick,
        color: 'bg-[#53FC18]',
        textColor: 'text-[#0FA654] dark:text-[#0FA654]',
        iconColor: 'text-black',
        brandColor: '#53FC18'
    },
    dashboard: {
        name: 'Dashboard',
        Icon: MdSend,
        color: 'bg-[#10B981]',
        textColor: 'text-[#10B981] dark:text-[#10B981]',
        iconColor: 'text-white',
        brandColor: '#10B981'
    },
    system: {
        name: 'Sistema',
        Icon: MdInfo,
        color: 'bg-gray-500',
        textColor: 'text-gray-400',
        iconColor: 'text-white',
        brandColor: '#6b7280'
    }
} as const;

export type PlatformKey = keyof typeof PLATFORMS;
