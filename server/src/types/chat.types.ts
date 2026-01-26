/**
 * Tipos específicos de chat
 */

import { Platform } from '../constants/platforms';

export interface ChatEvent {
    id: string;
    platform: Platform;
    type: 'message' | 'gift' | 'follow' | 'subscribe' | 'raid' | 'viewers';
    data: Record<string, string | number | boolean | undefined>;
    timestamp: Date;
}

export interface ChatMessageEvent extends ChatEvent {
    type: 'message';
    data: {
        userId: string;
        username: string;
        message: string;
        avatar?: string;
        isMod?: boolean;
        isSub?: boolean;
        isOwner?: boolean;
    };
}

export interface ChatGiftEvent extends ChatEvent {
    type: 'gift';
    data: {
        userId: string;
        username: string;
        giftName: string;
        giftCount: number;
        avatar?: string;
    };
}

export interface ChatFollowEvent extends ChatEvent {
    type: 'follow';
    data: {
        userId: string;
        username: string;
        avatar?: string;
    };
}

export interface ChatViewersEvent extends ChatEvent {
    type: 'viewers';
    data: {
        count: number;
    };
}

export type AnyChartEvent = ChatMessageEvent | ChatGiftEvent | ChatFollowEvent | ChatViewersEvent;
