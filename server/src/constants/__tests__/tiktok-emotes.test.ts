import { describe, it, expect } from '@jest/globals';
import { replaceTikTokEmotes, TIKTOK_EMOTE_MAP } from '../tiktok-emotes';

describe('replaceTikTokEmotes', () => {
    it('should replace single TikTok emote with emoji', () => {
        const result = replaceTikTokEmotes('[heart]');
        expect(result).toBe('❤️');
    });

    it('should replace multiple same emotes', () => {
        const result = replaceTikTokEmotes('[heart][heart][heart]');
        expect(result).toBe('❤️❤️❤️');
    });

    it('should replace multiple different emotes', () => {
        const result = replaceTikTokEmotes('[heart][hi][thumb]');
        expect(result).toBe('❤️👋👍');
    });

    it('should replace emotes mixed with text', () => {
        const result = replaceTikTokEmotes('Hola [heart] mundo [hi]');
        expect(result).toBe('Hola ❤️ mundo 👋');
    });

    it('should handle complex message from screenshot', () => {
        const result = replaceTikTokEmotes('[heart][heart][heart][heart][heart][rosiekisskiss][heart]');
        expect(result).toBe('❤️❤️❤️❤️❤️💋❤️');
    });

    it('should not modify regular emojis', () => {
        const result = replaceTikTokEmotes('Hola 😀😃😄');
        expect(result).toBe('Hola 😀😃😄');
    });

    it('should handle empty message', () => {
        const result = replaceTikTokEmotes('');
        expect(result).toBe('');
    });

    it('should handle message with no emotes', () => {
        const result = replaceTikTokEmotes('Just a normal message');
        expect(result).toBe('Just a normal message');
    });

    it('should handle unknown emote shortcodes', () => {
        const result = replaceTikTokEmotes('[unknown][heart]');
        expect(result).toBe('[unknown]❤️');
    });

    it('should replace all Rocky series emotes', () => {
        const result = replaceTikTokEmotes('[rockyserious][rockyloveit][rockyproud][rockycool]');
        expect(result).toBe('😐😍😎😎');
    });

    it('should replace all Rosie series emotes', () => {
        const result = replaceTikTokEmotes('[rosiedislike][rosieawkward][rosiekisskiss][rosiecute]');
        expect(result).toBe('👎😅💋🥰');
    });

    it('should replace all Jollie series emotes', () => {
        const result = replaceTikTokEmotes('[jolliekissingface][jolliewow][jolliespeechless][jolliesatisfied]');
        expect(result).toBe('😘😲😶😌');
    });

    it('should replace all Sage series emotes', () => {
        const result = replaceTikTokEmotes('[sagethink][sagefulfilled][sageclever][sagemoney]');
        expect(result).toBe('🤔😊🧠💰');
    });

    it('should have all 24 emotes defined', () => {
        const emoteCount = Object.keys(TIKTOK_EMOTE_MAP).length;
        expect(emoteCount).toBe(24);
    });
});
