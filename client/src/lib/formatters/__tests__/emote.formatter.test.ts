import { describe, it, expect } from 'vitest';
import { parseMessageWithEmotes } from '../emote.formatter';

describe('parseMessageWithEmotes', () => {
  it('should return text only when no emotes', () => {
    const result = parseMessageWithEmotes('Hello world', []);
    expect(result).toEqual([{ type: 'text', value: 'Hello world' }]);
  });

  it('should parse message with single emote', () => {
    const message = 'Hello Kappa world';
    const emotes = [
      {
        id: '25',
        name: 'Kappa',
        url: 'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0',
        positions: [[6, 10]] as [number, number][],
      },
    ];

    const result = parseMessageWithEmotes(message, emotes);

    expect(result).toEqual([
      { type: 'text', value: 'Hello ' },
      {
        type: 'emote',
        value: 'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0',
        name: 'Kappa',
      },
      { type: 'text', value: ' world' },
    ]);
  });

  it('should parse message with multiple emotes', () => {
    const message = 'Kappa test LUL';
    const emotes = [
      {
        id: '25',
        name: 'Kappa',
        url: 'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0',
        positions: [[0, 4]] as [number, number][],
      },
      {
        id: '425618',
        name: 'LUL',
        url: 'https://static-cdn.jtvnw.net/emoticons/v2/425618/default/dark/1.0',
        positions: [[11, 13]] as [number, number][],
      },
    ];

    const result = parseMessageWithEmotes(message, emotes);

    expect(result).toEqual([
      {
        type: 'emote',
        value: 'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0',
        name: 'Kappa',
      },
      { type: 'text', value: ' test ' },
      {
        type: 'emote',
        value: 'https://static-cdn.jtvnw.net/emoticons/v2/425618/default/dark/1.0',
        name: 'LUL',
      },
    ]);
  });

  it('should handle repeated emotes', () => {
    const message = 'LUL LUL wow';
    const emotes = [
      {
        id: '425618',
        name: 'LUL',
        url: 'https://static-cdn.jtvnw.net/emoticons/v2/425618/default/dark/1.0',
        positions: [
          [0, 2],
          [4, 6],
        ] as [number, number][],
      },
    ];

    const result = parseMessageWithEmotes(message, emotes);

    expect(result).toEqual([
      {
        type: 'emote',
        value: 'https://static-cdn.jtvnw.net/emoticons/v2/425618/default/dark/1.0',
        name: 'LUL',
      },
      { type: 'text', value: ' ' },
      {
        type: 'emote',
        value: 'https://static-cdn.jtvnw.net/emoticons/v2/425618/default/dark/1.0',
        name: 'LUL',
      },
      { type: 'text', value: ' wow' },
    ]);
  });

  it('should handle message ending with emote', () => {
    const message = 'Hello Kappa';
    const emotes = [
      {
        id: '25',
        name: 'Kappa',
        url: 'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0',
        positions: [[6, 10]] as [number, number][],
      },
    ];

    const result = parseMessageWithEmotes(message, emotes);

    expect(result).toEqual([
      { type: 'text', value: 'Hello ' },
      {
        type: 'emote',
        value: 'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0',
        name: 'Kappa',
      },
    ]);
  });

  it('should handle message starting with emote', () => {
    const message = 'Kappa hello';
    const emotes = [
      {
        id: '25',
        name: 'Kappa',
        url: 'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0',
        positions: [[0, 4]] as [number, number][],
      },
    ];

    const result = parseMessageWithEmotes(message, emotes);

    expect(result).toEqual([
      {
        type: 'emote',
        value: 'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0',
        name: 'Kappa',
      },
      { type: 'text', value: ' hello' },
    ]);
  });
});
