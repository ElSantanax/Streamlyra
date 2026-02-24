export interface TwitchTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type?: string;
    scope?: string[];
}

export interface TwitchUser {
    id: string;
    login: string;
    display_name: string;
    type: string;
    broadcaster_type: string;
    description: string;
    profile_image_url: string;
    offline_image_url: string;
    view_count: number;
    email?: string;
    created_at: string;
}

export interface TwitchUserResponse {
    data: TwitchUser[];
}

export interface TwitchStream {
    id: string;
    user_id: string;
    user_login: string;
    user_name: string;
    game_id: string;
    game_name: string;
    type: string;
    title: string;
    viewer_count: number;
    started_at: string;
    language: string;
    thumbnail_url: string;
    tag_ids: string[];
    is_mature: boolean;
}

export interface TwitchStreamResponse {
    data: TwitchStream[];
    pagination?: {
        cursor?: string;
    };
}

export interface TwitchFollower {
    user_id: string;
    user_name: string;
    user_login: string;
    followed_at: string;
}

export interface TwitchFollowerResponse {
    total: number;
    data: TwitchFollower[];
    pagination?: {
        cursor?: string;
    };
}

// --- Twitch EventSub (Webhooks) Types ---

export interface TwitchEventSubSubscription {
    id: string;
    status: string;
    type: string;
    version: string;
    condition: Record<string, string>;
    transport: {
        method: string;
        callback: string;
    };
    created_at: string;
    cost: number;
}

export interface TwitchEventSubVerificationPayload {
    subscription: TwitchEventSubSubscription;
    challenge: string;
}

export interface TwitchEventSubNotificationPayload<T = unknown> {
    subscription: TwitchEventSubSubscription;
    event: T;
}

export interface TwitchFollowEventSub {
    user_id: string;
    user_login: string;
    user_name: string;
    broadcaster_user_id: string;
    broadcaster_user_login: string;
    broadcaster_user_name: string;
    followed_at: string;
}

export interface TwitchSubEventSub {
    user_id: string;
    user_login: string;
    user_name: string;
    broadcaster_user_id: string;
    broadcaster_user_login: string;
    broadcaster_user_name: string;
    tier: string;
    is_gift: boolean;
}

export interface TwitchRaidEventSub {
    from_broadcaster_user_id: string;
    from_broadcaster_user_login: string;
    from_broadcaster_user_name: string;
    to_broadcaster_user_id: string;
    to_broadcaster_user_login: string;
    to_broadcaster_user_name: string;
    viewers: number;
}

export interface TwitchRewardRedemptionEventSub {
    id: string;
    broadcaster_user_id: string;
    broadcaster_user_login: string;
    broadcaster_user_name: string;
    user_id: string;
    user_login: string;
    user_name: string;
    user_input: string;
    status: string;
    redeemed_at: string;
    reward: {
        id: string;
        title: string;
        cost: number;
        prompt: string;
    };
}

export interface TwitchChatMessageEventSub {
    broadcaster_user_id: string;
    broadcaster_user_login: string;
    broadcaster_user_name: string;
    chatter_user_id: string;
    chatter_user_login: string;
    chatter_user_name: string;
    message_id: string;
    message: {
        text: string;
        fragments: Array<{
            type: string;
            text: string;
            cheermote?: {
                prefix: string;
                bits: number;
                tier: number;
            };
            emote?: {
                id: string;
                set_id: string;
            };
            mention?: {
                user_id: string;
                user_login: string;
                user_name: string;
            };
        }>;
    };
    color: string;
    badges: Array<{
        set_id: string;
        id: string;
        info: string;
    }>;
    message_type: string;
}
