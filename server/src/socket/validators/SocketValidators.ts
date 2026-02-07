import { SendMessageRequest, ModerationActionRequest } from '../../types/message.types';
import { PLATFORMS, Platform } from '../../constants/platforms';

const MAX_MESSAGE_LENGTH = 500;
const MAX_USERNAME_LENGTH = 100;

export function isValidSendMessagePayload(payload: unknown): payload is SendMessageRequest {
    if (!payload || typeof payload !== 'object') {
        return false;
    }

    const p = payload as Record<string, unknown>;

    return (
        typeof p.userId === 'string' &&
        typeof p.message === 'string' &&
        p.message.length > 0 &&
        p.message.length <= MAX_MESSAGE_LENGTH &&
        Array.isArray(p.platforms) &&
        p.platforms.length > 0 &&
        p.platforms.every((platform: unknown) =>
            typeof platform === 'string' &&
            PLATFORMS.includes(platform as Platform)
        )
    );
}

export function isValidModerationPayload(payload: unknown): payload is ModerationActionRequest {
    if (!payload || typeof payload !== 'object') {
        return false;
    }

    const p = payload as Record<string, unknown>;

    if (
        typeof p.userId !== 'string' ||
        typeof p.platform !== 'string' ||
        typeof p.action !== 'string'
    ) {
        return false;
    }

    // El dashboard puede ser origen de acciones, pero las plataformas de destino son las reales
    const validPlatforms = [...PLATFORMS, 'dashboard'];
    if (!validPlatforms.includes(p.platform as string)) {
        return false;
    }

    const validActions = ['delete', 'ban', 'timeout'];
    if (!validActions.includes(p.action as string)) {
        return false;
    }

    const isTargetUsernameValid = !p.targetUsername || (
        typeof p.targetUsername === 'string' &&
        p.targetUsername.length <= MAX_USERNAME_LENGTH
    );

    if (!isTargetUsernameValid) return false;

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
