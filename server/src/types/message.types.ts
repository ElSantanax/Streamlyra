import { Platform } from '../constants/platforms';

export interface PlatformResult {
    platform: Platform;
    success: boolean;
    messageId?: string;
    error?: string;
    errorCode?: string;
}

export interface SendMessageRequest {
    userId: string;
    message: string;
    platforms: Platform[];
}

export interface SendMessageResponse {
    success: boolean;
    results: PlatformResult[];
    timestamp: string;
}

export interface ModerationActionRequest {
    userId: string;
    platform: Platform | 'dashboard';
    action: 'delete' | 'ban' | 'timeout';
    messageId?: string;
    targetUserId?: string;
    targetUsername?: string;
    reason?: string;
    duration?: number;
    platformIds?: Record<string, string>;
}