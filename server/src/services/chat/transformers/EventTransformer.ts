export interface NormalizedChatMessage {
    id: string;
    platform: 'twitch' | 'youtube' | 'kick' | 'tiktok';
    user: string;
    message: string;
    specialMessage?: string;
    time: string;
    color?: string;
    avatar?: string;
    isMod?: boolean;
    isSub?: boolean;
    isVIP?: boolean;
    isOwner?: boolean;
    isSpecial?: boolean;
    bits?: number;
    messageId?: string;
    userId?: string;
    roomId?: string;
    emotes?: Array<{
        id: string;
        name: string;
        url: string;
        positions: Array<[number, number]>;
    }>;
}
