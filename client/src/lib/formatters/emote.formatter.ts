const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Solo permitir protocolos seguros para prevenir ataques XSS (javascript:, data:, etc.)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseTextWithUrls(text: string): MessagePart[] {
  const parts: MessagePart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex para evitar estados residuales en ejecuciones consecutivas
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    const url = match[0];
    const startIndex = match.index;

    if (startIndex > lastIndex) {
      parts.push({
        type: 'text',
        value: text.substring(lastIndex, startIndex),
      });
    }

    if (isValidUrl(url)) {
      parts.push({
        type: 'link',
        value: url,
        url: url,
      });
    } else {
      parts.push({
        type: 'text',
        value: url,
      });
    }

    lastIndex = startIndex + url.length;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      value: text.substring(lastIndex),
    });
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', value: text });
  }

  return parts;
}

export interface EmoteData {
  id: string;
  name: string;
  url: string;
  positions: Array<[number, number]>;
}

export interface MessagePart {
  type: 'text' | 'emote' | 'link';
  value: string;
  name?: string;
  url?: string;
}

export function parseMessageWithEmotes(
  message: string,
  emotes?: EmoteData[]
): MessagePart[] {
  if (!emotes || emotes.length === 0) {
    return parseTextWithUrls(message);
  }

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

  // Ordenar por posición es crítico para el recorrido secuencial del string
  emotePositions.sort((a, b) => a.start - b.start);

  const parts: MessagePart[] = [];
  let currentIndex = 0;

  emotePositions.forEach(({ start, end, url, name }) => {
    if (currentIndex < start) {
      const textPart = message.substring(currentIndex, start);
      if (textPart) {
        const textParts = parseTextWithUrls(textPart);
        parts.push(...textParts);
      }
    }

    parts.push({
      type: 'emote',
      value: url,
      name,
    });

    currentIndex = end + 1;
  });

  if (currentIndex < message.length) {
    const textPart = message.substring(currentIndex);
    if (textPart) {
      const textParts = parseTextWithUrls(textPart);
      parts.push(...textParts);
    }
  }

  return parts;
}