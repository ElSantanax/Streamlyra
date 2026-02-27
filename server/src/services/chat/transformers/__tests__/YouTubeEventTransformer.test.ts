import { YouTubeEventTransformer } from '../YouTubeEventTransformer';
import { YouTubeChatMessage } from '../../../../types/youtube.types';

jest.mock('../../../../constants/youtube-emotes', () => ({
    parseYouTubeEmotes: jest.fn((message: string) => {
        if (message.includes(':fire:')) {
            return [{
                id: 'fire',
                name: ':fire:',
                url: 'https://example.com/fire.png',
                positions: [[0, 5]]
            }];
        }
        return [];
    })
}));

describe('YouTubeEventTransformer', () => {
    let transformer: YouTubeEventTransformer;

    beforeEach(() => {
        transformer = new YouTubeEventTransformer();
    });

    describe('transformMessage', () => {
        it('debe transformar mensaje básico correctamente', () => {
            const message: YouTubeChatMessage = {
                id: 'msg-123',
                authorDetails: {
                    channelId: 'channel-123',
                    channelUrl: 'https://youtube.com/channel/123',
                    displayName: 'TestUser',
                    profileImageUrl: 'https://example.com/avatar.jpg',
                    isChatModerator: false,
                    isChatOwner: false,
                    isVerified: false,
                    isChatSponsor: false
                },
                snippet: {
                    type: 'textMessageEvent',
                    liveChatId: 'chat-123',
                    displayMessage: 'Hello world',
                    publishedAt: '2025-01-01T12:00:00Z'
                }
            };

            const result = transformer.transformMessage(message);

            expect(result.id).toBe('msg-123');
            expect(result.platform).toBe('youtube');
            expect(result.user).toBe('TestUser');
            expect(result.message).toBe('Hello world');
            expect(result.color).toBe('#FF0000');
        });

        it('debe identificar roles correctamente', () => {
            const message: YouTubeChatMessage = {
                id: 'msg-123',
                authorDetails: {
                    channelId: 'channel-123',
                    channelUrl: 'https://youtube.com/channel/123',
                    displayName: 'Owner',
                    profileImageUrl: 'https://example.com/avatar.jpg',
                    isChatModerator: true,
                    isChatOwner: true,
                    isVerified: true,
                    isChatSponsor: true
                },
                snippet: {
                    type: 'textMessageEvent',
                    liveChatId: 'chat-123',
                    displayMessage: 'Hello',
                    publishedAt: '2025-01-01T12:00:00Z'
                }
            };

            const result = transformer.transformMessage(message);

            expect(result.isMod).toBe(true);
            expect(result.isOwner).toBe(true);
            expect(result.isVIP).toBe(true);
            expect(result.isSub).toBe(true);
        });

        it('debe transformar Super Chat correctamente', () => {
            const message: YouTubeChatMessage = {
                id: 'msg-123',
                authorDetails: {
                    channelId: 'channel-123',
                    channelUrl: 'https://youtube.com/channel/123',
                    displayName: 'Donor',
                    profileImageUrl: 'https://example.com/avatar.jpg',
                    isChatModerator: false,
                    isChatOwner: false,
                    isVerified: false,
                    isChatSponsor: false
                },
                snippet: {
                    type: 'superChatEvent',
                    liveChatId: 'chat-123',
                    displayMessage: '',
                    publishedAt: '2025-01-01T12:00:00Z',
                    superChatDetails: {
                        amountMicros: '5000000',
                        currency: 'USD',
                        amountDisplayString: '$5.00',
                        userComment: 'Great stream!'
                    }
                }
            };

            const result = transformer.transformMessage(message);

            expect(result.specialMessage).toContain('DONACIÓN DE $5.00');
            expect(result.message).toBe('Great stream!');
            expect(result.isSpecial).toBe(true);
        });

        it('debe transformar nuevo miembro correctamente', () => {
            const message: YouTubeChatMessage = {
                id: 'msg-123',
                authorDetails: {
                    channelId: 'channel-123',
                    channelUrl: 'https://youtube.com/channel/123',
                    displayName: 'NewMember',
                    profileImageUrl: 'https://example.com/avatar.jpg',
                    isChatModerator: false,
                    isChatOwner: false,
                    isVerified: false,
                    isChatSponsor: true
                },
                snippet: {
                    type: 'newMemberEvent',
                    liveChatId: 'chat-123',
                    displayMessage: '',
                    publishedAt: '2025-01-01T12:00:00Z',
                    newMemberDetails: {
                        memberLevelName: 'Member'
                    }
                }
            };

            const result = transformer.transformMessage(message);

            expect(result.specialMessage).toContain('NUEVO MIEMBRO: Member');
            expect(result.isSub).toBe(true);
            expect(result.isSpecial).toBe(true);
        });

        it('debe transformar milestone de membresía correctamente', () => {
            const message: YouTubeChatMessage = {
                id: 'msg-123',
                authorDetails: {
                    channelId: 'channel-123',
                    channelUrl: 'https://youtube.com/channel/123',
                    displayName: 'LongTimeMember',
                    profileImageUrl: 'https://example.com/avatar.jpg',
                    isChatModerator: false,
                    isChatOwner: false,
                    isVerified: false,
                    isChatSponsor: true
                },
                snippet: {
                    type: 'memberMilestoneChatEvent',
                    liveChatId: 'chat-123',
                    displayMessage: '',
                    publishedAt: '2025-01-01T12:00:00Z',
                    memberMilestoneChatDetails: {
                        userComment: 'Thanks for the content!',
                        memberLevelName: 'Member',
                        memberMonth: 12
                    }
                }
            };

            const result = transformer.transformMessage(message);

            expect(result.specialMessage).toContain('MIEMBRO POR 12 MESES');
            expect(result.message).toBe('Thanks for the content!');
            expect(result.isSub).toBe(true);
        });

        it('debe manejar milestone de 1 mes correctamente', () => {
            const message: YouTubeChatMessage = {
                id: 'msg-123',
                authorDetails: {
                    channelId: 'channel-123',
                    channelUrl: 'https://youtube.com/channel/123',
                    displayName: 'NewMember',
                    profileImageUrl: 'https://example.com/avatar.jpg',
                    isChatModerator: false,
                    isChatOwner: false,
                    isVerified: false,
                    isChatSponsor: true
                },
                snippet: {
                    type: 'memberMilestoneChatEvent',
                    liveChatId: 'chat-123',
                    displayMessage: '',
                    publishedAt: '2025-01-01T12:00:00Z',
                    memberMilestoneChatDetails: {
                        userComment: 'First month!',
                        memberLevelName: 'Member',
                        memberMonth: 1
                    }
                }
            };

            const result = transformer.transformMessage(message);

            expect(result.specialMessage).toContain('MIEMBRO POR 1 MES');
        });

        it('debe transformar regalo de membresías correctamente', () => {
            const message: YouTubeChatMessage = {
                id: 'msg-123',
                authorDetails: {
                    channelId: 'channel-123',
                    channelUrl: 'https://youtube.com/channel/123',
                    displayName: 'Gifter',
                    profileImageUrl: 'https://example.com/avatar.jpg',
                    isChatModerator: false,
                    isChatOwner: false,
                    isVerified: false,
                    isChatSponsor: false
                },
                snippet: {
                    type: 'membershipGiftingEvent',
                    liveChatId: 'chat-123',
                    displayMessage: '',
                    publishedAt: '2025-01-01T12:00:00Z',
                    membershipGiftingDetails: {
                        giftMembershipsCount: 5,
                        giftMembershipsLevelName: 'Member'
                    }
                }
            };

            const result = transformer.transformMessage(message);

            expect(result.specialMessage).toContain('HA REGALADO 5 MEMBRESÍAS');
            expect(result.isSpecial).toBe(true);
        });

        it('debe parsear emotes cuando están presentes', () => {
            const message: YouTubeChatMessage = {
                id: 'msg-123',
                authorDetails: {
                    channelId: 'channel-123',
                    channelUrl: 'https://youtube.com/channel/123',
                    displayName: 'TestUser',
                    profileImageUrl: 'https://example.com/avatar.jpg',
                    isChatModerator: false,
                    isChatOwner: false,
                    isVerified: false,
                    isChatSponsor: false
                },
                snippet: {
                    type: 'textMessageEvent',
                    liveChatId: 'chat-123',
                    displayMessage: ':fire: Great stream',
                    publishedAt: '2025-01-01T12:00:00Z'
                }
            };

            const result = transformer.transformMessage(message);

            expect(result.emotes).toBeDefined();
            expect(result.emotes).toHaveLength(1);
        });
    });
});
