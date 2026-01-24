export interface YouTubeTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type?: string;
    scope?: string;
}

export interface YouTubeChannel {
    id: string;
    snippet: {
        title: string;
        description: string;
        customUrl: string;
        publishedAt: string;
        thumbnails: {
            default?: { url: string; width?: number; height?: number };
            medium?: { url: string; width?: number; height?: number };
            high?: { url: string; width?: number; height?: number };
        };
    };
    statistics?: {
        viewCount: string;
        subscriberCount: string;
        hiddenSubscriberCount: boolean;
        videoCount: string;
    };
}

export interface YouTubeChannelResponse {
    kind: string;
    etag: string;
    pageInfo?: {
        totalResults: number;
        resultsPerPage: number;
    };
    items: YouTubeChannel[];
}

export interface YouTubeBroadcast {
    id: string;
    status: {
        lifeCycleStatus: string;
        privacyStatus: string;
        recordingStatus: string;
    };
    snippet: {
        publishedAt: string;
        channelId: string;
        title: string;
        description: string;
        thumbnails: Record<string, { url: string }>;
        scheduledStartTime: string;
        actualStartTime?: string;
        isDefaultBroadcast: boolean;
        liveChatId?: string;
    };
}

export interface YouTubeBroadcastResponse {
    kind: string;
    etag: string;
    items: YouTubeBroadcast[];
}

export interface YouTubeChatMessage {
    id: string;
    authorDetails: {
        channelId: string;
        channelUrl: string;
        displayName: string;
        profileImageUrl: string;
        isChatModerator: boolean;
        isChatOwner: boolean;
        isVerified: boolean;
        isChatSponsor: boolean;
    };
    snippet: {
        type: string;
        liveChatId: string;
        displayMessage: string;
        publishedAt: string;
        superChatDetails?: {
            amountMicros: string;
            currency: string;
            amountDisplayString: string;
            userComment: string;
        };
        newMemberDetails?: {
            memberLevelName: string;
        };
        membershipGiftingDetails?: {
            giftMembershipsCount: number;
            giftMembershipsLevelName: string;
        };
        memberMilestoneChatDetails?: {
            userComment: string;
            memberLevelName: string;
            memberMonth: number;
        };
    };
}

export interface YouTubeChatMessagesResponse {
    kind: string;
    etag: string;
    items: YouTubeChatMessage[];
    nextPageToken: string;
    pollingIntervalMillis: number;
    pageInfo: {
        totalResults: number;
        resultsPerPage: number;
    };
}

export interface YouTubeVideo {
    id: string;
    liveStreamingDetails: {
        actualStartTime: string;
        concurrentViewers: string;
        activeLiveChatId: string;
    };
}

export interface YouTubeVideoResponse {
    kind: string;
    etag: string;
    items: YouTubeVideo[];
}
