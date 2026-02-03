import { describe, it, expect } from '@jest/globals';
import { parseYouTubeEmotes, YOUTUBE_EMOTE_MAP } from '../youtube-emotes';

describe('parseYouTubeEmotes', () => {
    it('should parse single YouTube emote', () => {
        const result = parseYouTubeEmotes(':yt:');
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            id: ':yt:',
            name: ':yt:',
            url: '/icons/youtube/yt.png',
            positions: [[0, 3]]
        });
    });

    it('should parse multiple same emotes', () => {
        const result = parseYouTubeEmotes(':yt::yt::yt:');
        expect(result).toHaveLength(1);
        expect(result[0].positions).toHaveLength(3);
        expect(result[0].positions).toEqual([[0, 3], [4, 7], [8, 11]]);
    });

    it('should parse multiple different emotes', () => {
        const result = parseYouTubeEmotes(':yt::oops::buffering:');
        expect(result).toHaveLength(3);
    });

    it('should parse emotes mixed with text', () => {
        const result = parseYouTubeEmotes('Hola :yougotthis: mundo :yt:');
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe(':yougotthis:');
        expect(result[1].name).toBe(':yt:');
    });

    it('should handle empty message', () => {
        const result = parseYouTubeEmotes('');
        expect(result).toHaveLength(0);
    });

    it('should handle message with no emotes', () => {
        const result = parseYouTubeEmotes('Just a normal message');
        expect(result).toHaveLength(0);
    });

    it('should ignore unknown emote shortcodes', () => {
        const result = parseYouTubeEmotes(':unknown::yt:');
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe(':yt:');
    });

    it('should parse COVID-19 related emotes', () => {
        const result = parseYouTubeEmotes(':stayhome::washhands::socialdist:');
        expect(result).toHaveLength(3);
        expect(result[0].url).toBe('/icons/youtube/stayhome.png');
        expect(result[1].url).toBe('/icons/youtube/washhands.png');
        expect(result[2].url).toBe('/icons/youtube/socialdist.png');
    });

    it('should parse emotes with long descriptive names', () => {
        const result = parseYouTubeEmotes(':face-blue-smiling::hand-pink-waving:');
        expect(result).toHaveLength(2);
        expect(result[0].url).toBe('/icons/youtube/face-blue-smiling.png');
        expect(result[1].url).toBe('/icons/youtube/hand-pink-waving.png');
    });

    it('should handle emotes at different positions', () => {
        const message = 'Start :yt: middle :oops: end';
        const result = parseYouTubeEmotes(message);
        expect(result).toHaveLength(2);
        expect(result[0].positions[0][0]).toBe(6); // Position of :yt:
        expect(result[1].positions[0][0]).toBe(18); // Position of :oops:
    });

    it('should have all 100 emotes defined', () => {
        const emoteCount = Object.keys(YOUTUBE_EMOTE_MAP).length;
        expect(emoteCount).toBe(100);
    });

    it('should handle complex real-world message', () => {
        const message = 'Great stream! :yougotthis::yt::face-blue-heart-eyes: Keep it up!';
        const result = parseYouTubeEmotes(message);
        expect(result).toHaveLength(3);
    });

    it('should correctly calculate positions for consecutive emotes', () => {
        const result = parseYouTubeEmotes(':yt::oops:');
        expect(result).toHaveLength(2);
        // :yt: is at position 0-3
        expect(result[0].positions[0]).toEqual([0, 3]);
        // :oops: is at position 4-9
        expect(result[1].positions[0]).toEqual([4, 9]);
    });

    it('should handle emotes with special characters in name', () => {
        const result = parseYouTubeEmotes(':person-turqouise-waving:');
        expect(result).toHaveLength(1);
        expect(result[0].url).toBe('/icons/youtube/person-turqouise-waving.png');
    });
});
