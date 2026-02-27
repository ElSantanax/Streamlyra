import { KickEventTransformer } from '../KickEventTransformer';
import {
    KickChatMessagePayload,
    KickSubscriptionEvent,
    KickGiftEvent,
    KickFollowEvent,
    KickRewardRedemptionEvent
} from '../../../../types/kick.types';

describe('KickEventTransformer', () => {
    let transformer: KickEventTransformer;

    beforeEach(() => {
        transformer = new KickEventTransformer();
    });

    describe('transformMessage', () => {
        it('debe transformar mensaje básico correctamente', () => {
            const payload: KickChatMessagePayload = {
                message_id: 'msg-123',
                broadcaster: {
                    is_anonymous: false,
                    user_id: 1,
                    username: 'broadcaster',
                    is_verified: true,
                    profile_picture: 'pic.jpg',
                    channel_slug: 'channel'
                },
                sender: {
                    is_anonymous: false,
                    user_id: 2,
                    username: 'testuser',
                    is_verified: false,
                    profile_picture: 'pic.jpg',
                    channel_slug: 'user',
                    identity: {
                        username_color: '#ffffff',
                        badges: []
                    }
                },
                content: 'Hello world',
                created_at: '2025-01-01T12:00:00Z'
            };

            const result = transformer.transformMessage(payload);

            expect(result.id).toBe('msg-123');
            expect(result.platform).toBe('kick');
            expect(result.user).toBe('testuser');
            expect(result.message).toBe('Hello world');
            expect(result.color).toBe('#53fc18');
            expect(result.isOwner).toBe(false);
        });

        it('debe identificar correctamente al broadcaster como owner', () => {
            const payload: KickChatMessagePayload = {
                message_id: 'msg-123',
                broadcaster: {
                    is_anonymous: false,
                    user_id: 1,
                    username: 'broadcaster',
                    is_verified: true,
                    profile_picture: 'pic.jpg',
                    channel_slug: 'channel'
                },
                sender: {
                    is_anonymous: false,
                    user_id: 1,
                    username: 'broadcaster',
                    is_verified: true,
                    profile_picture: 'pic.jpg',
                    channel_slug: 'channel',
                    identity: {
                        username_color: '#ffffff',
                        badges: []
                    }
                },
                content: 'Hello',
                created_at: '2025-01-01T12:00:00Z'
            };

            const result = transformer.transformMessage(payload);

            expect(result.isOwner).toBe(true);
        });

        it('debe identificar badges correctamente', () => {
            const payload: KickChatMessagePayload = {
                message_id: 'msg-123',
                broadcaster: {
                    is_anonymous: false,
                    user_id: 1,
                    username: 'broadcaster',
                    is_verified: true,
                    profile_picture: 'pic.jpg',
                    channel_slug: 'channel'
                },
                sender: {
                    is_anonymous: false,
                    user_id: 2,
                    username: 'testuser',
                    is_verified: false,
                    profile_picture: 'pic.jpg',
                    channel_slug: 'user',
                    identity: {
                        username_color: '#ffffff',
                        badges: [
                            { type: 'moderator', text: 'MOD' },
                            { type: 'subscriber', text: 'SUB' }
                        ]
                    }
                },
                content: 'Hello',
                created_at: '2025-01-01T12:00:00Z'
            };

            const result = transformer.transformMessage(payload);

            expect(result.isMod).toBe(true);
            expect(result.isSub).toBe(true);
        });

        it('debe parsear emotes correctamente', () => {
            const payload: KickChatMessagePayload = {
                message_id: 'msg-123',
                broadcaster: {
                    is_anonymous: false,
                    user_id: 1,
                    username: 'broadcaster',
                    is_verified: true,
                    profile_picture: 'pic.jpg',
                    channel_slug: 'channel'
                },
                sender: {
                    is_anonymous: false,
                    user_id: 2,
                    username: 'testuser',
                    is_verified: false,
                    profile_picture: 'pic.jpg',
                    channel_slug: 'user'
                },
                content: 'Hello Kappa world',
                created_at: '2025-01-01T12:00:00Z',
                emotes: [
                    {
                        emote_id: 'emote-123',
                        positions: [{ s: 6, e: 10 }]
                    }
                ]
            };

            const result = transformer.transformMessage(payload);

            expect(result.emotes).toBeDefined();
            expect(result.emotes).toHaveLength(1);
            expect(result.emotes?.[0].id).toBe('emote-123');
            expect(result.emotes?.[0].name).toBe('Kappa');
        });
    });

    describe('transformSubscription', () => {
        it('debe transformar nueva suscripción', () => {
            const event: KickSubscriptionEvent = {
                broadcaster: {
                    is_anonymous: false,
                    user_id: 1,
                    username: 'broadcaster',
                    is_verified: true,
                    profile_picture: 'pic.jpg',
                    channel_slug: 'channel'
                },
                subscriber: {
                    is_anonymous: false,
                    user_id: 2,
                    username: 'subscriber',
                    is_verified: false,
                    profile_picture: 'pic.jpg',
                    channel_slug: 'user'
                },
                duration: 1,
                created_at: '2025-01-01T12:00:00Z'
            };

            const result = transformer.transformSubscription(event);

            expect(result.platform).toBe('kick');
            expect(result.user).toBe('subscriber');
            expect(result.specialMessage).toContain('NUEVA SUSCRIPCIÓN');
            expect(result.isSub).toBe(true);
        });

        it('debe transformar renovación de suscripción', () => {
            const event: KickSubscriptionEvent = {
                broadcaster: {
                    is_anonymous: false,
                    user_id: 1,
                    username: 'broadcaster',
                    is_verified: true,
                    profile_picture: 'pic.jpg',
                    channel_slug: 'channel'
                },
                subscriber: {
                    is_anonymous: false,
                    user_id: 2,
                    username: 'subscriber',
                    is_verified: false,
                    profile_picture: 'pic.jpg',
                    channel_slug: 'user'
                },
                duration: 3,
                created_at: '2025-01-01T12:00:00Z'
            };

            const result = transformer.transformSubscription(event);

            expect(result.specialMessage).toContain('RENOVÓ SU SUSCRIPCIÓN POR 3 MESES');
        });
    });

    describe('transformGift', () => {
        it('debe transformar regalo de suscripciones', () => {
            const event: KickGiftEvent = {
                broadcaster: {
                    is_anonymous: false,
                    user_id: 1,
                    username: 'broadcaster',
                    is_verified: true,
                    profile_picture: 'pic.jpg',
                    channel_slug: 'channel'
                },
                gifter: {
                    is_anonymous: false,
                    user_id: 2,
                    username: 'gifter',
                    is_verified: false,
                    profile_picture: 'pic.jpg',
                    channel_slug: 'user'
                },
                giftees: [
                    {
                        is_anonymous: false,
                        user_id: 3,
                        username: 'giftee1',
                        is_verified: false,
                        profile_picture: 'pic.jpg',
                        channel_slug: 'user'
                    },
                    {
                        is_anonymous: false,
                        user_id: 4,
                        username: 'giftee2',
                        is_verified: false,
                        profile_picture: 'pic.jpg',
                        channel_slug: 'user'
                    }
                ],
                created_at: '2025-01-01T12:00:00Z'
            };

            const result = transformer.transformGift(event);

            expect(result.platform).toBe('kick');
            expect(result.user).toBe('gifter');
            expect(result.specialMessage).toContain('REGALÓ 2 SUSCRIPCIONES');
        });
    });

    describe('transformFollow', () => {
        it('debe transformar evento de seguidor', () => {
            const event: KickFollowEvent = {
                broadcaster: {
                    is_anonymous: false,
                    user_id: 1,
                    username: 'broadcaster',
                    is_verified: true,
                    profile_picture: 'pic.jpg',
                    channel_slug: 'channel'
                },
                follower: {
                    is_anonymous: false,
                    user_id: 2,
                    username: 'follower',
                    is_verified: false,
                    profile_picture: 'pic.jpg',
                    channel_slug: 'user'
                },
                created_at: '2025-01-01T12:00:00Z'
            };

            const result = transformer.transformFollow(event);

            expect(result.platform).toBe('kick');
            expect(result.user).toBe('follower');
            expect(result.specialMessage).toContain('NUEVO SEGUIDOR');
            expect(result.isSpecial).toBe(true);
        });
    });

    describe('transformRewardRedemption', () => {
        it('debe transformar canje de recompensa con input de usuario', () => {
            const event: KickRewardRedemptionEvent = {
                id: 'redemption-123',
                broadcaster_user_id: 1,
                redeemer: {
                    is_anonymous: false,
                    user_id: 2,
                    username: 'redeemer',
                    is_verified: false,
                    profile_picture: 'pic.jpg',
                    channel_slug: 'user'
                },
                reward: {
                    id: 'reward-123',
                    title: 'Custom Song',
                    cost: 500,
                    description: 'Play a song'
                },
                user_input: 'My favorite song',
                status: 'fulfilled',
                created_at: '2025-01-01T12:00:00Z'
            };

            const result = transformer.transformRewardRedemption(event);

            expect(result.platform).toBe('kick');
            expect(result.user).toBe('redeemer');
            expect(result.specialMessage).toContain('CANJEÓ "Custom Song"');
            expect(result.specialMessage).toContain('500 puntos');
            expect(result.specialMessage).toContain('My favorite song');
        });

        it('debe transformar canje sin input de usuario', () => {
            const event: KickRewardRedemptionEvent = {
                id: 'redemption-123',
                broadcaster_user_id: 1,
                redeemer: {
                    is_anonymous: false,
                    user_id: 2,
                    username: 'redeemer',
                    is_verified: false,
                    profile_picture: 'pic.jpg',
                    channel_slug: 'user'
                },
                reward: {
                    id: 'reward-123',
                    title: 'Highlight Message',
                    cost: 100,
                    description: 'Highlight your message'
                },
                status: 'fulfilled',
                created_at: '2025-01-01T12:00:00Z'
            };

            const result = transformer.transformRewardRedemption(event);

            expect(result.specialMessage).toContain('CANJEÓ "Highlight Message"');
            expect(result.specialMessage).not.toContain('→');
        });
    });
});
