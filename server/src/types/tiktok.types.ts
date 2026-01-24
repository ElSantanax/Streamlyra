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
    giftDetails?: {
        image?: {
            url_list: string[];
        };
    };
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
