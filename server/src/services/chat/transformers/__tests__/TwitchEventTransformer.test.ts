import { TwitchEventTransformer } from '../TwitchEventTransformer';
import {
    TwitchFollowEventSub,
    TwitchSubEventSub,
    TwitchRaidEventSub,
    TwitchRewardRedemptionEventSub,
    TwitchChatMessageEventSub
} from '../../../../types/twitch.types';

describe('TwitchEventTransformer', () => {
    let transformer: TwitchEventTransformer;

    beforeEach(() => {
        transformer = new TwitchEventTransformer();
    });

    describe('transformChatMessage', () => {
        it('debe transformar mensaje básico correctamente', () => {
            const tags = {
                id: 'msg-123',
                'display-name': 'TestUser',
                username: 'testuser',
                'user-id': 'user-123',
                'room-id': 'room-123',
                mod: false,
                subscriber: false,
                badges: {}
            };

            const result = transformer.transformChatMessage(tags, 'Hello world');

            expect(result.id).toBe('msg-123');
            expect(result.platform).toBe('twitch');
            expect(result.user).toBe('TestUser');
            expect(result.message).toBe('Hello world');
            expect(result.color).toBe('#9146FF');
        });

        it('debe identificar badges correctamente', () => {
            const tags = {
                id: 'msg-123',
                'display-name': 'Broadcaster',
                mod: true,
                subscriber: true,
                vip: true,
                badges: { broadcaster: '1', moderator: '1', subscriber: '1' }
            };

            const result = transformer.transformChatMessage(tags, 'Hello');

            expect(result.isMod).toBe(true);
            expect(result.isSub).toBe(true);
            expect(result.isVIP).toBe(true);
            expect(result.isOwner).toBe(true);
        });

        it('debe parsear emotes correctamente', () => {
            const tags = {
                id: 'msg-123',
                'display-name': 'TestUser',
                emotes: {
                    '25': ['0-4', '11-15']
                }
            };

            const result = transformer.transformChatMessage(tags, 'Kappa test Kappa');

            expect(result.emotes).toBeDefined();
            expect(result.emotes).toHaveLength(1);
            expect(result.emotes?.[0].id).toBe('25');
            expect(result.emotes?.[0].name).toBe('Kappa');
            expect(result.emotes?.[0].positions).toHaveLength(2);
        });

        it('debe manejar mensaje sin emotes', () => {
            const tags = {
                id: 'msg-123',
                'display-name': 'TestUser'
            };

            const result = transformer.transformChatMessage(tags, 'Hello world');

            expect(result.emotes).toBeUndefined();
        });
    });

    describe('transformEventSubFollow', () => {
        it('debe transformar evento de seguidor', () => {
            const event: TwitchFollowEventSub = {
                user_id: 'user-123',
                user_login: 'testuser',
                user_name: 'TestUser',
                broadcaster_user_id: 'broadcaster-123',
                broadcaster_user_login: 'broadcaster',
                broadcaster_user_name: 'Broadcaster',
                followed_at: '2025-01-01T12:00:00Z'
            };

            const result = transformer.transformEventSubFollow(event);

            expect(result.platform).toBe('twitch');
            expect(result.user).toBe('TestUser');
            expect(result.specialMessage).toContain('NUEVO SEGUIDOR');
            expect(result.isSpecial).toBe(true);
            expect(result.userId).toBe('user-123');
        });
    });

    describe('transformEventSubSubscription', () => {
        it('debe transformar nueva suscripción', () => {
            const event: TwitchSubEventSub = {
                user_id: 'user-123',
                user_login: 'testuser',
                user_name: 'TestUser',
                broadcaster_user_id: 'broadcaster-123',
                broadcaster_user_login: 'broadcaster',
                broadcaster_user_name: 'Broadcaster',
                tier: '1000',
                is_gift: false
            };

            const result = transformer.transformEventSubSubscription(event);

            expect(result.platform).toBe('twitch');
            expect(result.user).toBe('TestUser');
            expect(result.specialMessage).toContain('Nueva Suscripción');
            expect(result.isSub).toBe(true);
        });

        it('debe transformar suscripción de regalo', () => {
            const event: TwitchSubEventSub = {
                user_id: 'user-123',
                user_login: 'testuser',
                user_name: 'TestUser',
                broadcaster_user_id: 'broadcaster-123',
                broadcaster_user_login: 'broadcaster',
                broadcaster_user_name: 'Broadcaster',
                tier: '1000',
                is_gift: true
            };

            const result = transformer.transformEventSubSubscription(event);

            expect(result.specialMessage).toContain('Suscripción de Regalo');
        });
    });

    describe('transformEventSubRaid', () => {
        it('debe transformar evento de raid', () => {
            const event: TwitchRaidEventSub = {
                from_broadcaster_user_id: 'raider-123',
                from_broadcaster_user_login: 'raider',
                from_broadcaster_user_name: 'Raider',
                to_broadcaster_user_id: 'broadcaster-123',
                to_broadcaster_user_login: 'broadcaster',
                to_broadcaster_user_name: 'Broadcaster',
                viewers: 150
            };

            const result = transformer.transformEventSubRaid(event);

            expect(result.platform).toBe('twitch');
            expect(result.user).toBe('Raider');
            expect(result.specialMessage).toContain('RAID CON 150 ESPECTADORES');
            expect(result.isSpecial).toBe(true);
        });
    });

    describe('transformEventSubRewardRedemption', () => {
        it('debe transformar canje de recompensa con input', () => {
            const event: TwitchRewardRedemptionEventSub = {
                id: 'redemption-123',
                broadcaster_user_id: 'broadcaster-123',
                broadcaster_user_login: 'broadcaster',
                broadcaster_user_name: 'Broadcaster',
                user_id: 'user-123',
                user_login: 'testuser',
                user_name: 'TestUser',
                user_input: 'My custom message',
                status: 'fulfilled',
                redeemed_at: '2025-01-01T12:00:00Z',
                reward: {
                    id: 'reward-123',
                    title: 'Highlight Message',
                    cost: 500,
                    prompt: 'Highlight your message'
                }
            };

            const result = transformer.transformEventSubRewardRedemption(event);

            expect(result.platform).toBe('twitch');
            expect(result.user).toBe('TestUser');
            expect(result.specialMessage).toContain('CANJEÓ "Highlight Message"');
            expect(result.specialMessage).toContain('500 puntos');
            expect(result.specialMessage).toContain('My custom message');
        });

        it('debe transformar canje sin input', () => {
            const event: TwitchRewardRedemptionEventSub = {
                id: 'redemption-123',
                broadcaster_user_id: 'broadcaster-123',
                broadcaster_user_login: 'broadcaster',
                broadcaster_user_name: 'Broadcaster',
                user_id: 'user-123',
                user_login: 'testuser',
                user_name: 'TestUser',
                user_input: '',
                status: 'fulfilled',
                redeemed_at: '2025-01-01T12:00:00Z',
                reward: {
                    id: 'reward-123',
                    title: 'Hydrate',
                    cost: 100,
                    prompt: 'Remind streamer to drink water'
                }
            };

            const result = transformer.transformEventSubRewardRedemption(event);

            expect(result.specialMessage).toContain('CANJEÓ "Hydrate"');
            expect(result.specialMessage).not.toContain('→');
        });
    });

    describe('transformEventSubChatMessage', () => {
        it('debe transformar mensaje de EventSub con emotes', () => {
            const event: TwitchChatMessageEventSub = {
                broadcaster_user_id: 'broadcaster-123',
                broadcaster_user_login: 'broadcaster',
                broadcaster_user_name: 'Broadcaster',
                chatter_user_id: 'user-123',
                chatter_user_login: 'testuser',
                chatter_user_name: 'TestUser',
                message_id: 'msg-123',
                message: {
                    text: 'Hello Kappa world',
                    fragments: [
                        { type: 'text', text: 'Hello ' },
                        { type: 'emote', text: 'Kappa', emote: { id: '25', set_id: 'global' } },
                        { type: 'text', text: ' world' }
                    ]
                },
                color: '#FF0000',
                badges: [
                    { set_id: 'moderator', id: '1', info: '' }
                ],
                message_type: 'text'
            };

            const result = transformer.transformEventSubChatMessage(event);

            expect(result.platform).toBe('twitch');
            expect(result.user).toBe('TestUser');
            expect(result.message).toBe('Hello Kappa world');
            expect(result.color).toBe('#FF0000');
            expect(result.isMod).toBe(true);
            expect(result.emotes).toHaveLength(1);
        });

        it('debe calcular bits correctamente', () => {
            const event: TwitchChatMessageEventSub = {
                broadcaster_user_id: 'broadcaster-123',
                broadcaster_user_login: 'broadcaster',
                broadcaster_user_name: 'Broadcaster',
                chatter_user_id: 'user-123',
                chatter_user_login: 'testuser',
                chatter_user_name: 'TestUser',
                message_id: 'msg-123',
                message: {
                    text: 'Cheer100 Hello',
                    fragments: [
                        { type: 'cheermote', text: 'Cheer100', cheermote: { prefix: 'Cheer', bits: 100, tier: 1 } },
                        { type: 'text', text: ' Hello' }
                    ]
                },
                color: '#9146FF',
                badges: [],
                message_type: 'text'
            };

            const result = transformer.transformEventSubChatMessage(event);

            expect(result.bits).toBe(100);
        });
    });
});
