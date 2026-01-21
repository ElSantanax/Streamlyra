import type { PlatformKey } from './platforms';

export interface Message {
    platform: PlatformKey;
    user: string;
    message: string;
    time: string;
    isSub?: boolean;
    isMod?: boolean;
    specialMessage?: string;
}

export const SAMPLE_MESSAGES: Message[] = [
    {
        platform: 'system',
        user: 'Sistema',
        message: 'Bienvenido al Chat de Streamlyra. Estás conectado a Twitch, YouTube y TikTok. Todos los servicios están funcionando correctamente.',
        time: '12:00 PM'
    },
    {
        platform: 'twitch',
        user: 'PogChampUser',
        message: "Pogchamp! Can't believe you did that 360 noscope! @StreamerName",
        time: '12:04 PM',
        isSub: true
    },
    {
        platform: 'youtube',
        user: 'ViewerBR',
        message: 'Is this live? Hello from Brazil! 🇧🇷 Love the content and the new setup looks amazing.',
        time: '12:05 PM'
    },
    {
        platform: 'tiktok',
        user: 'DanceQueen99',
        message: 'Sent a Rose',
        specialMessage: 'Sent a Rose 🌹 x5',
        time: '12:06 PM'
    },
    {
        platform: 'twitch',
        user: 'ModMaster',
        message: "Don't forget to follow the rules guys! No spamming caps please. We want to keep the chat clean and friendly for everyone joining the stream today",
        time: '12:07 PM',
        isMod: true
    },
    {
        platform: 'youtube',
        user: 'TechGuru',
        message: "I've been following your progress for months and I must say the quality of your stream has improved significantly. The way you interact with the audience while maintaining high-level gameplay is truly impressive. Keep up the great work!",
        time: '12:10 PM'
    },
    {
        platform: 'tiktok',
        user: 'SuperFan_TikTok',
        message: 'Sent a Galaxy',
        specialMessage: 'Sent a Galaxy 🌌',
        time: '12:12 PM'
    },
    {
        platform: 'twitch',
        user: 'GiftKing',
        message: 'Gifting 5 subs',
        specialMessage: 'Gifting 5 T1 Subs to the community! 🎁',
        time: '12:16 PM',
        isSub: true
    }
];
