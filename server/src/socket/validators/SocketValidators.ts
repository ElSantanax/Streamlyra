import { SendMessageRequest, ModerationActionRequest } from '../../types/message.types';

export function isValidSendMessagePayload(payload: unknown): payload is SendMessageRequest {
    if (!payload || typeof payload !== 'object') {
        return false;
    }

    const p = payload as Record<string, unknown>;

    return (
        typeof p.userId === 'string' &&
        typeof p.message === 'string' &&
        Array.isArray(p.platforms) &&
        p.platforms.every((platform: unknown) => typeof platform === 'string')
    );
}

export function isValidModerationPayload(payload: unknown): payload is ModerationActionRequest {
    if (!payload || typeof payload !== 'object') {
        return false;
    }

    const p = payload as Record<string, unknown>;

    if (typeof p.userId !== 'string' || typeof p.platform !== 'string' || typeof p.action !== 'string') {
        return false;
    }

    const validPlatforms = ['twitch', 'kick', 'youtube', 'dashboard'];
    if (!validPlatforms.includes(p.platform as string)) {
        return false;
    }

    const validActions = ['delete', 'ban', 'timeout'];
    if (!validActions.includes(p.action as string)) {
        return false;
    }

    if (p.action === 'delete' && typeof p.messageId !== 'string') {
        return false;
    }

    if ((p.action === 'ban' || p.action === 'timeout') && typeof p.targetUserId !== 'string') {
        return false;
    }

    if (p.platformIds !== undefined && typeof p.platformIds !== 'object') {
        return false;
    }

    return true;
}
