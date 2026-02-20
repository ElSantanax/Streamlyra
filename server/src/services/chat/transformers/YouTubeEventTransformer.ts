import { YouTubeChatMessage } from '../../../types/youtube.types';
import { NormalizedChatMessage } from './EventTransformer';
import { BaseEventTransformer } from './BaseEventTransformer';
import { parseYouTubeEmotes } from '../../../constants/youtube-emotes';

export class YouTubeEventTransformer extends BaseEventTransformer {
    protected readonly platformName = 'youtube';

    transformMessage(item: YouTubeChatMessage): NormalizedChatMessage {
        let specialMessage: string | undefined;
        let displayMessage = (item.snippet?.displayMessage as string) || '';
        let isSub = (item.authorDetails?.isChatSponsor as boolean) || false;

        const type = item.snippet?.type;
        if (type === 'superChatEvent') {
            specialMessage = `¡DONACIÓN DE ${(item.snippet?.superChatDetails as Record<string, unknown>)?.amountDisplayString}! 💰`;
            displayMessage = (item.snippet?.superChatDetails as Record<string, unknown>)?.userComment as string || '';
        } else if (type === 'newMemberEvent') {
            specialMessage = `¡NUEVO MIEMBRO: ${(item.snippet?.newMemberDetails as Record<string, unknown>)?.memberLevelName}! 💎`;
            isSub = true;
        } else if (type === 'memberMilestoneChatEvent') {
            const months = (item.snippet?.memberMilestoneChatDetails as Record<string, unknown>)?.memberMonth;
            specialMessage = `¡MIEMBRO POR ${months} ${months === 1 ? 'MES' : 'MESES'}! 🔥`;
            displayMessage = (item.snippet?.memberMilestoneChatDetails as Record<string, unknown>)?.userComment as string || '';
            isSub = true;
        } else if (type === 'membershipGiftingEvent') {
            specialMessage = `¡HA REGALADO ${(item.snippet?.membershipGiftingDetails as Record<string, unknown>)?.giftMembershipsCount} MEMBRESÍAS! 🎁`;
        }

        const parsedEmotes = parseYouTubeEmotes(displayMessage);

        return {
            id: (item.id as string) || '',
            messageId: (item.id as string) || '',
            platform: 'youtube',
            user: (item.authorDetails?.displayName as string) || '',
            userId: (item.authorDetails?.channelId as string) || '',
            message: displayMessage,
            specialMessage,
            time: this.formatTime(new Date((item.snippet?.publishedAt as string) || Date.now())),
            color: '#FF0000',
            avatar: item.authorDetails?.profileImageUrl as string,
            isMod: item.authorDetails?.isChatModerator as boolean,
            isOwner: item.authorDetails?.isChatOwner as boolean,
            isSub,
            isVIP: item.authorDetails?.isVerified as boolean,
            isSpecial: !!specialMessage,
            emotes: parsedEmotes.length > 0 ? parsedEmotes : undefined
        };
    }

    transformSpecialEvent(_data: unknown): NormalizedChatMessage {
        throw new Error('Method not implemented.');
    }
}