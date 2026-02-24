export interface KickIdentityBadge {
    type: string;
    text: string;
    count?: number;
}

export interface KickIdentity {
    username_color: string;
    badges: KickIdentityBadge[];
}

export interface KickUser {
    is_anonymous: boolean;
    user_id: number;
    username: string;
    is_verified: boolean;
    profile_picture: string;
    channel_slug: string;
    identity?: KickIdentity | null;
}

export interface KickBroadcaster {
    is_anonymous: boolean;
    user_id: number;
    username: string;
    is_verified: boolean;
    profile_picture: string;
    channel_slug: string;
    identity?: KickIdentity | null;
}

export interface KickChatMessagePayload {
    message_id: string;
    broadcaster: KickBroadcaster;
    sender: KickUser;
    content: string;
    created_at: string;
    emotes?: Array<{
        emote_id: string;
        positions: Array<{ s: number; e: number }>;
    }>;
    replies_to?: {
        message_id: string;
        content: string;
        sender: KickUser;
    };
}

export interface KickLivestream {
    is_live: boolean;
    viewer_count: number;
}

export interface KickChannel {
    broadcaster_user_id: number;
    slug: string;
    stream?: KickLivestream | null;
}

export interface KickApiResponse<T> {
    data: T;
    message?: string;
}

// OAuth and Profile types
export interface KickOAuthUser {
    user_id: number;
    name: string;
    email?: string;
    profile_picture: string;
}

export interface KickOAuthUserResponse {
    data: KickOAuthUser[];
}

export interface KickChannelResponse {
    data: KickChannel[];
}


// Webhook Events
export interface KickSubscriptionEvent {
    broadcaster: KickBroadcaster;
    subscriber: KickUser;
    duration: number;
    created_at: string;
}

export interface KickGiftEvent {
    broadcaster: KickBroadcaster;
    gifter: KickUser;
    giftees: KickUser[];
    created_at: string;
}

export interface KickFollowEvent {
    broadcaster: KickBroadcaster;
    follower: KickUser;
    created_at: string;
}

export interface KickLivestreamStatusEvent {
    broadcaster: KickBroadcaster;
    is_live: boolean;
    title: string;
    started_at?: string;
    ended_at?: string;
}

export interface KickRewardRedemptionEvent {
    id: string;
    broadcaster_user_id: number;
    redeemer: KickUser;
    reward: {
        id: string;
        title: string;
        cost: number;
        description: string;
    };
    user_input?: string;
    status: string;
    created_at: string;
}

export type KickWebhookPayload = KickChatMessagePayload | KickSubscriptionEvent | KickGiftEvent | KickFollowEvent | KickLivestreamStatusEvent | KickRewardRedemptionEvent;
