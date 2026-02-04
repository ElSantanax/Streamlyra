/**
 * Formateador de emotes para mensajes de chat
 * Convierte texto con emotes en elementos renderizables
 */

export interface EmoteData {
  id: string;
  name: string;
  url: string;
  positions: Array<[number, number]>;
}

export interface MessagePart {
  type: 'text' | 'emote';
  value: string; // texto o URL del emote
  name?: string; // nombre del emote (para alt/title)
}

export function parseMessageWithEmotes(
  message: string,
  emotes?: EmoteData[]
): MessagePart[] {
  if (!emotes || emotes.length === 0) {
    return [{ type: 'text', value: message }];
  }

  // Crear un array de todas las posiciones de emotes
  const emotePositions: Array<{
    start: number;
    end: number;
    url: string;
    name: string;
  }> = [];

  emotes.forEach((emote) => {
    emote.positions.forEach(([start, end]) => {
      emotePositions.push({
        start,
        end,
        url: emote.url,
        name: emote.name,
      });
    });
  });

  // Ordenar por posición de inicio
  emotePositions.sort((a, b) => a.start - b.start);

  const parts: MessagePart[] = [];
  let currentIndex = 0;

  emotePositions.forEach(({ start, end, url, name }) => {
    // Agregar texto antes del emote
    if (currentIndex < start) {
      const textPart = message.substring(currentIndex, start);
      if (textPart) {
        parts.push({ type: 'text', value: textPart });
      }
    }

    // Agregar el emote
    parts.push({
      type: 'emote',
      value: url,
      name,
    });

    currentIndex = end + 1;
  });

  // Agregar texto restante después del último emote
  if (currentIndex < message.length) {
    const textPart = message.substring(currentIndex);
    if (textPart) {
      parts.push({ type: 'text', value: textPart });
    }
  }

  return parts;
}
