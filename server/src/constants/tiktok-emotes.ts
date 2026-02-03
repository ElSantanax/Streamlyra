/**
 * Mapeo de emotes nativos de TikTok a rutas de imágenes locales
 * Los emotes de TikTok vienen como shortcodes [nombre] en el mensaje
 * Este diccionario los convierte a rutas de imágenes para renderizado
 */

export const TIKTOK_EMOTE_MAP: Record<string, string> = {
    // Emotes básicos de TikTok
    '[wow]': '/icons/tiktok/wow.png',
    '[laugh]': '/icons/tiktok/laugh.png',
    '[thanks]': '/icons/tiktok/thanks.png',
    '[laughcry]': '/icons/tiktok/laughcry.png',
    '[thumb]': '/icons/tiktok/thumb.png',
    '[hi]': '/icons/tiktok/hi.png',
    '[heart]': '/icons/tiktok/heart.png',
    '[congrat]': '/icons/tiktok/congrat.png',

    // Serie Rocky
    '[rockyserious]': '/icons/tiktok/rockyserious.png',
    '[rockyloveit]': '/icons/tiktok/rockyloveit.png',
    '[rockyproud]': '/icons/tiktok/rockyproud.png',
    '[rockycool]': '/icons/tiktok/rockycool.png',

    // Serie Rosie
    '[rosiedislike]': '/icons/tiktok/rosiedislike.png',
    '[rosieawkward]': '/icons/tiktok/rosieawkward.png',
    '[rosiekisskiss]': '/icons/tiktok/rosiekisskiss.png',
    '[rosiecute]': '/icons/tiktok/rosiecute.png',

    // Serie Jollie
    '[jolliekissingface]': '/icons/tiktok/jolliekissingface.png',
    '[jolliewow]': '/icons/tiktok/jolliewow.png',
    '[jolliespeechless]': '/icons/tiktok/jolliespeechless.png',
    '[jolliesatisfied]': '/icons/tiktok/jolliesatisfied.png',

    // Serie Sage
    '[sagethink]': '/icons/tiktok/sagethink.png',
    '[sagefulfilled]': '/icons/tiktok/sagefulfilled.png',
    '[sageclever]': '/icons/tiktok/sageclever.png',
    '[sagemoney]': '/icons/tiktok/sagemoney.png',
};

interface EmoteMatch {
    shortcode: string;
    url: string;
    start: number;
    end: number;
}

export function parseTikTokEmotes(message: string): Array<{
    id: string;
    name: string;
    url: string;
    positions: Array<[number, number]>;
}> {
    if (!message) return [];

    const emoteMatches: EmoteMatch[] = [];

    // Regex para encontrar todos los shortcodes [nombre]
    const emoteRegex = /\[(\w+)\]/g;
    let match;

    while ((match = emoteRegex.exec(message)) !== null) {
        const shortcode = match[0]; // [nombre]
        const emoteName = match[1]; // nombre
        const fullShortcode = `[${emoteName}]`;

        // Verificar si existe en nuestro mapeo
        if (TIKTOK_EMOTE_MAP[fullShortcode]) {
            emoteMatches.push({
                shortcode: fullShortcode,
                url: TIKTOK_EMOTE_MAP[fullShortcode],
                start: match.index,
                end: match.index + shortcode.length - 1,
            });
        }
    }

    // Agrupar emotes por URL (mismo emote puede aparecer múltiples veces)
    const emotesByUrl = new Map<string, EmoteMatch[]>();

    emoteMatches.forEach((emote) => {
        if (!emotesByUrl.has(emote.url)) {
            emotesByUrl.set(emote.url, []);
        }
        emotesByUrl.get(emote.url)!.push(emote);
    });

    // Convertir a formato esperado por el cliente
    const result: Array<{
        id: string;
        name: string;
        url: string;
        positions: Array<[number, number]>;
    }> = [];

    emotesByUrl.forEach((matches, url) => {
        const firstMatch = matches[0];
        result.push({
            id: firstMatch.shortcode,
            name: firstMatch.shortcode,
            url: url,
            positions: matches.map((m) => [m.start, m.end] as [number, number]),
        });
    });

    return result;
}
