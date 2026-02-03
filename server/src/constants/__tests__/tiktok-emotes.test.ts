import { describe, it, expect } from '@jest/globals';
import { parseTikTokEmotes, TIKTOK_EMOTE_MAP } from '../tiktok-emotes';

describe('parseTikTokEmotes', () => {
    it('should parse single TikTok emote', () => {
        const result = parseTikTokEmotes('[heart]');
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            id: '[heart]',
            name: '[heart]',
            url: '/icons/tiktok/heart.png',
            positions: [[0, 6]]
        });
    });

    it('should parse multiple same emotes', () => {
        const result = parseTikTokEmotes('[heart][heart][heart]');
        expect(result).toHaveLength(1);
        expect(result[0].positions).toHaveLength(3);
        expect(result[0].positions).toEqual([[0, 6], [7, 13], [14, 20]]);
    });

    it('should parse multiple different emotes', () => {
        const result = parseTikTokEmotes('[heart][hi][thumb]');
        expect(result).toHaveLength(3);
    });

    it('should parse emotes mixed with text', () => {
        const result = parseTikTokEmotes('Hola [heart] mundo [hi]');
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('[heart]');
        expect(result[1].name).toBe('[hi]');
    });

    it('should handle complex message from screenshot', () => {
        const result = parseTikTokEmotes('[heart][heart][heart][heart][heart][rosiekisskiss][heart]');
        expect(result).toHaveLength(2); // heart y rosiekisskiss
        expect(result[0].positions).toHaveLength(6); // 6 hearts
        expect(result[1].positions).toHaveLength(1); // 1 rosiekisskiss
    });

    it('should handle empty message', () => {
        const result = parseTikTokEmotes('');
        expect(result).toHaveLength(0);
    });

    it('should handle message with no emotes', () => {
        const result = parseTikTokEmotes('Just a normal message');
        expect(result).toHaveLength(0);
    });

    it('should ignore unknown emote shortcodes', () => {
        const result = parseTikTokEmotes('[unknown][heart]');
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('[heart]');
    });

    it('should parse all Rocky series emotes', () => {
        const result = parseTikTokEmotes('[rockyserious][rockyloveit][rockyproud][rockycool]');
        expect(result).toHaveLength(4);
    });

    it('should parse all Rosie series emotes', () => {
        const result = parseTikTokEmotes('[rosiedislike][rosieawkward][rosiekisskiss][rosiecute]');
        expect(result).toHaveLength(4);
    });

    it('should parse all Jollie series emotes', () => {
        const result = parseTikTokEmotes('[jolliekissingface][jolliewow][jolliespeechless][jolliesatisfied]');
        expect(result).toHaveLength(4);
    });

    it('should parse all Sage series emotes', () => {
        const result = parseTikTokEmotes('[sagethink][sagefulfilled][sageclever][sagemoney]');
        expect(result).toHaveLength(4);
    });

    it('should have all 24 emotes defined', () => {
        const emoteCount = Object.keys(TIKTOK_EMOTE_MAP).length;
        expect(emoteCount).toBe(24);
    });
});
