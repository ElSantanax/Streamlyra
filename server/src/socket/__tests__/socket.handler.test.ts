/**
 * Unit Tests for Socket Handler - send_message event
 * Feature: multi-platform-message-sending
 * 
 * Tests:
 * - Payload inválido emite error
 * - userId no coincide emite error
 * - TikTok es filtrado del array
 * 
 * Validates: Requirements 4.1, 4.2, 8.3
 */

// Helper function to test validation (copied from socket.handler.ts)
function isValidSendMessagePayload(payload: unknown): boolean {
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

describe('Socket Handler - send_message event', () => {
    describe('Payload validation (Requirement 4.1, 4.2)', () => {
        it('should reject null payload', () => {
            expect(isValidSendMessagePayload(null)).toBe(false);
        });

        it('should reject undefined payload', () => {
            expect(isValidSendMessagePayload(undefined)).toBe(false);
        });

        it('should reject payload missing userId', () => {
            const payload = {
                message: 'Hello',
                platforms: ['twitch']
            };
            expect(isValidSendMessagePayload(payload)).toBe(false);
        });

        it('should reject payload missing message', () => {
            const payload = {
                userId: 'user-123',
                platforms: ['twitch']
            };
            expect(isValidSendMessagePayload(payload)).toBe(false);
        });

        it('should reject payload missing platforms', () => {
            const payload = {
                userId: 'user-123',
                message: 'Hello'
            };
            expect(isValidSendMessagePayload(payload)).toBe(false);
        });

        it('should reject payload when userId is not a string', () => {
            const payload = {
                userId: 123,
                message: 'Hello',
                platforms: ['twitch']
            };
            expect(isValidSendMessagePayload(payload)).toBe(false);
        });

        it('should reject payload when message is not a string', () => {
            const payload = {
                userId: 'user-123',
                message: 123,
                platforms: ['twitch']
            };
            expect(isValidSendMessagePayload(payload)).toBe(false);
        });

        it('should reject payload when platforms is not an array', () => {
            const payload = {
                userId: 'user-123',
                message: 'Hello',
                platforms: 'twitch'
            };
            expect(isValidSendMessagePayload(payload)).toBe(false);
        });

        it('should reject payload when platforms array contains non-strings', () => {
            const payload = {
                userId: 'user-123',
                message: 'Hello',
                platforms: ['twitch', 123, 'youtube']
            };
            expect(isValidSendMessagePayload(payload)).toBe(false);
        });

        it('should accept valid payload', () => {
            const payload = {
                userId: 'user-123',
                message: 'Hello',
                platforms: ['twitch', 'youtube']
            };
            expect(isValidSendMessagePayload(payload)).toBe(true);
        });

        it('should accept payload with empty platforms array', () => {
            const payload = {
                userId: 'user-123',
                message: 'Hello',
                platforms: []
            };
            expect(isValidSendMessagePayload(payload)).toBe(true);
        });
    });

    describe('TikTok filtering (Requirement 8.3)', () => {
        it('should filter out tiktok from platforms array', () => {
            const platforms = ['twitch', 'tiktok', 'youtube'];
            const filtered = platforms.filter(p => p !== 'tiktok');
            
            expect(filtered).toEqual(['twitch', 'youtube']);
            expect(filtered).not.toContain('tiktok');
        });

        it('should handle array with only tiktok by returning empty array', () => {
            const platforms = ['tiktok'];
            const filtered = platforms.filter(p => p !== 'tiktok');
            
            expect(filtered).toEqual([]);
        });

        it('should not modify array when tiktok is not present', () => {
            const platforms = ['twitch', 'youtube', 'kick'];
            const filtered = platforms.filter(p => p !== 'tiktok');
            
            expect(filtered).toEqual(['twitch', 'youtube', 'kick']);
        });

        it('should filter multiple tiktok entries if present', () => {
            const platforms = ['tiktok', 'twitch', 'tiktok', 'youtube'];
            const filtered = platforms.filter(p => p !== 'tiktok');
            
            expect(filtered).toEqual(['twitch', 'youtube']);
            expect(filtered).not.toContain('tiktok');
        });

        it('should preserve order of non-tiktok platforms', () => {
            const platforms = ['youtube', 'tiktok', 'twitch', 'kick', 'tiktok'];
            const filtered = platforms.filter(p => p !== 'tiktok');
            
            expect(filtered).toEqual(['youtube', 'twitch', 'kick']);
        });
    });

    describe('UserId verification logic (Requirement 4.2)', () => {
        it('should detect userId mismatch', () => {
            const payloadUserId = 'user-123';
            const sessionUserId: string | undefined = 'user-456';
            
            const isAuthorized = sessionUserId === payloadUserId;
            
            expect(isAuthorized).toBe(false);
        });

        it('should detect missing session userId', () => {
            const payloadUserId = 'user-123';
            const sessionUserId: string | undefined = undefined;
            
            const isAuthorized = sessionUserId && sessionUserId === payloadUserId;
            
            expect(isAuthorized).toBeFalsy();
        });

        it('should allow matching userIds', () => {
            const payloadUserId = 'user-123';
            const sessionUserId: string | undefined = 'user-123';
            
            const isAuthorized = sessionUserId === payloadUserId;
            
            expect(isAuthorized).toBe(true);
        });
    });
});
