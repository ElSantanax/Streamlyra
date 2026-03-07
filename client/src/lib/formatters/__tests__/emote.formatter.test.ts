import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { parseMessageWithEmotes, type EmoteData } from '../emote.formatter';

describe('emote.formatter', () => {
  describe('parseMessageWithEmotes', () => {
    it('debería retornar el texto como texto plano si no hay emotes ni URLs', () => {
      const message = 'Hola este es un mensaje normal';
      const result = parseMessageWithEmotes(message);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'text', value: message });
    });

    it('debería detectar correctamente una URL segura y un texto', () => {
      const message = 'Mira este link: https://ejemplo.com';
      const result = parseMessageWithEmotes(message);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ type: 'text', value: 'Mira este link: ' });
      expect(result[1]).toEqual({ type: 'link', value: 'https://ejemplo.com', url: 'https://ejemplo.com' });
    });

    it('debería devolver texto plano si la URL no es segura o es inválida (ej: javascript:)', () => {
      const message = 'Usa este link: javascript:alert(1)';
      const result = parseMessageWithEmotes(message);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'text', value: 'Usa este link: javascript:alert(1)' });
    });

    it('debería parsear emotes correctamente basado en las posiciones de inicio y fin', () => {
      // Mensaje: "Hola Kappa mundo Kappa"
      // Índices:  01234      10        16
      const message = 'Hola Kappa mundo Kappa';
      const emotes: EmoteData[] = [
        {
          id: '1',
          name: 'Kappa',
          url: 'kappa.png',
          positions: [
            [5, 9],
            [17, 21],
          ]
        }
      ];

      const result = parseMessageWithEmotes(message, emotes);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ type: 'text', value: 'Hola ' });
      expect(result[1]).toEqual({ type: 'emote', value: 'kappa.png', name: 'Kappa' });
      expect(result[2]).toEqual({ type: 'text', value: ' mundo ' });
      expect(result[3]).toEqual({ type: 'emote', value: 'kappa.png', name: 'Kappa' });
    });

    it('debería combinar múltiples emotes de diferentes IDs correctamente', () => {
      // "LUL test PogChamp"
      const message = 'LUL test PogChamp';
      const emotes: EmoteData[] = [
        {
          id: '1',
          name: 'LUL',
          url: 'lul.png',
          positions: [[0, 2]]
        },
        {
          id: '2',
          name: 'PogChamp',
          url: 'pog.png',
          positions: [[9, 16]]
        }
      ];

      const result = parseMessageWithEmotes(message, emotes);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: 'emote', value: 'lul.png', name: 'LUL' });
      expect(result[1]).toEqual({ type: 'text', value: ' test ' });
      expect(result[2]).toEqual({ type: 'emote', value: 'pog.png', name: 'PogChamp' });
    });

    it('debería parsear combinaciones de URLs y Emotes', () => {
      // "Mira esto https://test.com Kappa"
      const message = 'Mira esto https://test.com Kappa';
      const emotes: EmoteData[] = [
        {
          id: '1',
          name: 'Kappa',
          url: 'kappa.png',
          positions: [[27, 31]]
        }
      ];

      const result = parseMessageWithEmotes(message, emotes);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ type: 'text', value: 'Mira esto ' });
      expect(result[1]).toEqual({ type: 'link', value: 'https://test.com', url: 'https://test.com' });
      expect(result[2]).toEqual({ type: 'text', value: ' ' });
      expect(result[3]).toEqual({ type: 'emote', value: 'kappa.png', name: 'Kappa' });
    });
  });

  describe('Propiedades con fast-check', () => {
    it('nunca debería fallar procesando strings aleatorios y siempre debe retornar al menos un elemento', () => {
      fc.assert(
        fc.property(fc.string(), (randomText) => {
          const result = parseMessageWithEmotes(randomText);
          expect(Array.isArray(result)).toBe(true);
          expect(result.length).toBeGreaterThanOrEqual(1);
        })
      );
    });

    it('el valor de todos los elementos combinados debe reconstruir el string original (si no hay emotes)', () => {
      fc.assert(
        fc.property(fc.string(), (randomText) => {
          const result = parseMessageWithEmotes(randomText);
          const combined = result.map((part) => part.value).join('');
          expect(combined).toBe(randomText);
        })
      );
    });
  });
});
