import { TikTokEventTransformer } from '../TikTokEventTransformer';
import { TikTokChatEvent, TikTokGiftEvent, TikTokFollowEvent } from '../../../../types/tiktok.types';

describe('TikTokEventTransformer', () => {
    let transformer: TikTokEventTransformer;

    beforeEach(() => {
        transformer = new TikTokEventTransformer();
    });

    describe('transformChatMessage', () => {
        it('debería transformar un mensaje de chat normal', () => {
            const mockEvent = {
                uniqueId: 'user123',
                nickname: 'User One',
                userId: '789',
                comment: 'Hola mundo',
                msgId: 'msg-456',
                mod: true,
                subscriber: false,
                isOwner: false
            } as unknown as TikTokChatEvent;

            const result = transformer.transformChatMessage(mockEvent);

            expect(result.id).toBe('msg-456');
            expect(result.platform).toBe('tiktok');
            expect(result.user).toBe('User One');
            expect(result.message).toBe('Hola mundo');
            expect(result.isMod).toBe(true);
            expect(result.isSub).toBe(false);
            expect(result.isOwner).toBe(false);
            expect(result.color).toBe('#FF0050');
            expect(result.time).toBeDefined();
        });

        it('debería usar uniqueId si el nickname no tiene caracteres legibles', () => {
            const mockEvent = {
                uniqueId: 'user123',
                nickname: '😊',
                userId: '789',
                comment: 'Hello',
                msgId: 'msg-456'
            } as unknown as TikTokChatEvent;

            const result = transformer.transformChatMessage(mockEvent);
            expect(result.user).toBe('user123');
        });

        it('debería manejar mensajes con solo emotes', () => {
            const mockEvent = {
                uniqueId: 'user123',
                nickname: 'User',
                comment: '',
                msgId: 'msg-456',
                emotes: [{
                    emoteId: 'emote1',
                    image: { url_list: ['http://emote-url'] }
                }]
            } as unknown as TikTokChatEvent;

            const result = transformer.transformChatMessage(mockEvent);

            expect(result.message).toBe('☺️');
            expect(result.emotes).toBeDefined();
            expect(result.emotes![0].url).toBe('http://emote-url');
            expect(result.emotes![0].positions).toEqual([[0, 1]]);
        });

        it('debería procesar emotes nativos de TikTok [wow]', () => {
            const mockEvent = {
                uniqueId: 'u',
                comment: 'Sorpresa [wow]',
                msgId: 'm'
            } as unknown as TikTokChatEvent;

            const result = transformer.transformChatMessage(mockEvent);
            expect(result.emotes).toHaveLength(1);
            expect(result.emotes![0].name).toBe('[wow]');
        });

        it('debería usar msgId de common si está presente', () => {
            const mockEvent = {
                common: { msgId: 'internal-id' },
                msgId: 'external-id'
            } as unknown as TikTokChatEvent;

            const result = transformer.transformChatMessage(mockEvent);
            expect(result.id).toBe('internal-id');
        });

        it('debería ignorar emotes sin URL', () => {
            const mockEvent = {
                comment: 'test',
                emotes: [{
                    emoteId: 'e1',
                    image: { url_list: [] }
                }]
            } as unknown as TikTokChatEvent;

            const result = transformer.transformChatMessage(mockEvent);
            expect(result.emotes).toBeUndefined();
        });

        it('debería manejar casos donde faltan datos de usuario', () => {
            const mockEvent = {
                comment: 'Test message',
                msgId: 'msg-456'
            } as unknown as TikTokChatEvent;

            const result = transformer.transformChatMessage(mockEvent);

            expect(result.user).toBe('Usuario');
            expect(result.message).toBe('Test message');
        });
    });

    describe('transformGift', () => {
        it('debería transformar un evento de regalo', () => {
            const mockEvent = {
                uniqueId: 'user123',
                nickname: 'Gifter',
                userId: '789',
                giftName: 'Rose',
                repeatCount: 5,
                giftId: 1,
                timestamp: 1625097600000
            } as unknown as TikTokGiftEvent;

            const result = transformer.transformGift(mockEvent);

            expect(result.id).toContain('tk_gift_789_1');
            expect(result.specialMessage).toBe('🎁 REGALO: 5x Rose');
            expect(result.isSpecial).toBe(true);
        });

        it('debería usar valores por defecto para regalo', () => {
            const mockEvent = {
                uniqueId: 'u',
                nickname: 'n'
            } as unknown as TikTokGiftEvent;

            const result = transformer.transformGift(mockEvent);
            expect(result.specialMessage).toBe('🎁 REGALO: 1x Regalo');
        });
    });

    describe('transformFollow', () => {
        it('debería transformar un evento de seguimiento', () => {
            const mockEvent = {
                uniqueId: 'follower123',
                nickname: 'New Follower',
                userId: '456'
            } as unknown as TikTokFollowEvent;

            const result = transformer.transformFollow(mockEvent);

            expect(result.id).toBe('tk_follow_456');
            expect(result.specialMessage).toBe('👤 NUEVO SEGUIDOR');
            expect(result.isSpecial).toBe(true);
        });

        it('debería usar uniqueId para el ID de seguimiento si userId es unknown', () => {
            const mockEvent = {
                uniqueId: 'unique1',
                nickname: 'Name',
                userId: ''
            } as unknown as TikTokFollowEvent;

            const result = transformer.transformFollow(mockEvent);
            expect(result.id).toBe('tk_follow_unique1');
        });

        it('debería usar unknown si no hay nada para el ID de seguimiento', () => {
            const mockEvent = {} as unknown as TikTokFollowEvent;
            const result = transformer.transformFollow(mockEvent);
            expect(result.id).toBe('tk_follow_unknown');
        });
    });

    describe('Unsupported methods', () => {
        it('transformMessage debería lanzar error', () => {
            expect(() => transformer.transformMessage({})).toThrow();
        });

        it('transformSpecialEvent debería lanzar error', () => {
            expect(() => transformer.transformSpecialEvent({})).toThrow();
        });
    });
});
