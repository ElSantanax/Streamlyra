export interface KickIdentityBadge {
    type: string;
    text: string;
    count?: number;
}

export interface KickIdentity {
    username_color: string;
    badges: KickIdentityBadge[];
}

export interface KickSender {
    id: number;
    user_id: number;
    username: string;
    identity?: KickIdentity;
}

export interface KickBroadcaster {
    user_id: number;
    username: string;
    channel_slug: string;
}

export interface KickChatMessagePayload {
    id: string;
    message_id?: string;
    event?: string;
    broadcaster: KickBroadcaster;
    sender: KickSender;
    content: string;
    created_at: string;
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
