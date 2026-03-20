import { TikTokChatEvent, TikTokGiftEvent, TikTokFollowEvent, TikTokEnvelopeEvent, TikTokMemberEvent } from '../../../types/tiktok.types';
import { NormalizedChatMessage } from './EventTransformer';
import { BaseEventTransformer } from './BaseEventTransformer';
import { parseTikTokEmotes } from '../../../constants/tiktok-emotes';

interface TikTokUser {
    nickname: string;
    uniqueId: string;
    userId: string;
}

interface TikTokInternalEvent {
    user?: TikTokUser;
    nickname?: string;
    uniqueId?: string;
    userId?: string;
    common?: {
        msgId?: string;
    };
    gift?: {
        name?: string;
        giftName?: string;
        id?: string | number;
    };
    extendedGiftInfo?: {
        name?: string;
        describe?: string;
    };
    repeatCount?: number;
}

export class TikTokEventTransformer extends BaseEventTransformer {
    protected readonly platformName = 'tiktok';

    private hasReadableCharacters(name: string): boolean {
        if (!name) return false;
        const alphanumericCount = (name.match(/[a-zA-Z0-9]/g) || []).length;
        return alphanumericCount >= 2;
    }

    private selectDisplayName(nickname: string, uniqueId: string): string {
        if (nickname && this.hasReadableCharacters(nickname)) {
            return nickname;
        }
        return uniqueId || nickname || 'Usuario';
    }

    transformMessage(_data: unknown): NormalizedChatMessage {
        throw new Error('Use transformChatMessage, transformGift, or transformFollow instead');
    }

    transformSpecialEvent(_data: unknown): NormalizedChatMessage {
        throw new Error('Use transformGift or transformFollow instead');
    }

    transformChatMessage(data: TikTokChatEvent): NormalizedChatMessage {
        const eventData = data as unknown as TikTokInternalEvent;
        const userObj = eventData.user || eventData;

        const username = this.selectDisplayName(userObj.nickname || '', userObj.uniqueId || '');
        const userId = userObj.userId || data.userId || 'unknown';

        let message = data.comment || '';

        if (!message || message.trim() === '') {
            if (data.emotes && data.emotes.length > 0) {
                message = '☺️';
            }
        }

        const parsedNativeEmotes = parseTikTokEmotes(message);
        const parsedCustomEmotes = this.parseEmotes(data.emotes, message);
        const allEmotes = [...parsedNativeEmotes, ...parsedCustomEmotes];

        return {
            id: eventData.common?.msgId || data.msgId || `tk_chat_${Date.now()}_${userId}`,
            platform: 'tiktok',
            user: username,
            message: message || '',
            time: this.formatTime(new Date()),
            color: '#FF0050',
            isMod: data.mod,
            isSub: data.subscriber,
            isOwner: data.isOwner,
            emotes: allEmotes.length > 0 ? allEmotes : undefined
        };
    }

    private parseEmotes(emotesData: Array<{ emoteId: string; image: { url_list: string[] } }> | undefined, message: string): Array<{
        id: string;
        name: string;
        url: string;
        positions: Array<[number, number]>;
    }> {
        if (!emotesData || emotesData.length === 0) {
            return [];
        }

        const emotes: Array<{
            id: string;
            name: string;
            url: string;
            positions: Array<[number, number]>;
        }> = [];

        const isEmoteOnly = !message || message.trim() === '' || message === '☺️';

        for (const emote of emotesData) {
            const emoteUrl = emote.image?.url_list?.[0];

            if (emoteUrl) {
                emotes.push({
                    id: emote.emoteId,
                    name: emote.emoteId,
                    url: emoteUrl,
                    positions: isEmoteOnly ? [[0, message.length - 1]] : []
                });
            }
        }

        return emotes;
    }

    transformGift(data: TikTokGiftEvent): NormalizedChatMessage {
        const eventData = data as unknown as TikTokInternalEvent;
        const userObj = eventData.user || eventData;

        const username = this.selectDisplayName(userObj.nickname || '', userObj.uniqueId || '');
        const userId = userObj.userId || data.userId || 'unknown';

        const giftName =
            eventData.extendedGiftInfo?.name ||
            eventData.gift?.giftName ||
            eventData.gift?.name ||
            data.giftName ||
            'Regalo';

        const repeatCount = eventData.repeatCount || data.repeatCount || 1;
        const giftId = `tk_gift_${userId}_${eventData.gift?.id || data.giftId}_${data.timestamp || Date.now()}`;

        return {
            id: giftId,
            platform: 'tiktok',
            user: username,
            message: '',
            specialMessage: `🎁 REGALO: ${repeatCount}x ${giftName}`,
            time: this.formatTime(new Date()),
            color: '#FF0050',
            isSpecial: true
        };
    }

    transformFollow(data: TikTokFollowEvent): NormalizedChatMessage {
        const eventData = data as unknown as TikTokInternalEvent;
        const userObj = eventData.user || eventData;

        const username = this.selectDisplayName(userObj.nickname || '', userObj.uniqueId || '');
        const userId = userObj.userId || data.userId || 'unknown';
        const followKey = userId !== 'unknown' ? userId : (userObj.uniqueId || data.uniqueId || 'unknown');
        const followId = `tk_follow_${followKey}`;

        return {
            id: followId,
            platform: 'tiktok',
            user: username,
            message: '',
            specialMessage: '👤 NUEVO SEGUIDOR',
            time: this.formatTime(new Date()),
            color: '#FF0050',
            isSpecial: true
        };
    }

    transformEnvelope(data: TikTokEnvelopeEvent): NormalizedChatMessage {
        const username = this.selectDisplayName(data.nickname || '', data.uniqueId || '');
        const chestId = `tk_envelope_${data.envelopeId || Date.now()}`;
        const amountStr = data.diamondCount ? ` (${data.diamondCount} 💎)` : '';

        return {
            id: chestId,
            platform: 'tiktok',
            user: username,
            message: '',
            specialMessage: `🧧 COFRE DE TESORO${amountStr}`,
            time: this.formatTime(new Date()),
            color: '#FF0050',
            isSpecial: true
        };
    }

    transformSubscribe(data: TikTokMemberEvent): NormalizedChatMessage {
        const username = this.selectDisplayName(data.nickname || '', data.uniqueId || '');
        const subId = `tk_sub_${data.uniqueId || Date.now()}`;

        return {
            id: subId,
            platform: 'tiktok',
            user: username,
            message: '',
            specialMessage: '⭐ NUEVO SUSCRIPTOR',
            time: this.formatTime(new Date()),
            color: '#FF0050',
            isSpecial: true
        };
    }
}