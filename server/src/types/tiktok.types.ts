export interface TikTokChatEvent {
    comment: string;
    userId: string;
    uniqueId: string;
    nickname: string;
    profilePictureUrl: string;
    followRole: number;
    userBadges: Array<{ type?: string; name?: string }>;
    mod: boolean;
    subscriber: boolean;
    isOwner: boolean;
    createTime: string;
    msgId?: string;
    emotes?: Array<{
        emoteId: string;
        image: {
            url_list: string[];
        };
    }>;
}

export interface TikTokGiftEvent {
    giftId: number;
    giftName: string;
    repeatCount: number;
    userId: string;
    uniqueId: string;
    nickname: string;
    profilePictureUrl: string;
    timestamp?: number;
    repeatEnd?: boolean;
    diamondCount?: number;
    giftDetails?: {
        image?: {
            url_list: string[];
        };
    };
}

export interface TikTokEnvelopeEvent {
    envelopeId: string;
    nickname: string;
    uniqueId: string;
    profilePictureUrl?: string;
    diamondCount?: number;
    peopleCount?: number;
}

export interface TikTokMemberEvent {
    userId: string;
    uniqueId: string;
    nickname: string;
    profilePictureUrl: string;
    action: number; // 3 = SUBSCRIBED
}

export interface TikTokLikeEvent {
    likeCount: number;
    totalLikeCount: number;
    userId: string;
    uniqueId: string;
    nickname: string;
}

export interface TikTokFollowEvent {
    userId: string;
    uniqueId: string;
    nickname: string;
    profilePictureUrl: string;
}

export interface TikTokShareEvent {
    userId: string;
    uniqueId: string;
    nickname: string;
    profilePictureUrl: string;
}

export interface TikTokRoomUserInfo {
    viewerCount: number;
}

export interface TikTokConnection {
    on(event: 'chat', listener: (data: TikTokChatEvent) => void): this;
    on(event: 'gift', listener: (data: TikTokGiftEvent) => void): this;
    on(event: 'like', listener: (data: TikTokLikeEvent) => void): this;
    on(event: 'follow', listener: (data: TikTokFollowEvent) => void): this;
    on(event: 'share', listener: (data: TikTokShareEvent) => void): this;
    on(event: 'roomUser', listener: (data: TikTokRoomUserInfo) => void): this;
    on(event: 'member', listener: (data: TikTokMemberEvent) => void): this;
    on(event: 'envelope', listener: (data: TikTokEnvelopeEvent) => void): this;
    on(event: 'disconnected', listener: () => void): this;
    on(event: 'error', listener: (err: Error | unknown) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;

    disconnect(): Promise<void>;
    getState?(): unknown;
    removeAllListeners(event?: string): this;
}
