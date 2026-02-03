/**
 * Mapeo de emotes nativos de TikTok a emojis Unicode
 * Los emotes de TikTok vienen como shortcodes [nombre] en el mensaje
 * Este diccionario los convierte a emojis visibles
 */

export const TIKTOK_EMOTE_MAP: Record<string, string> = {
    // Emotes básicos de TikTok
    '[wow]': '😮',
    '[laugh]': '😂',
    '[thanks]': '🙏',
    '[laughcry]': '😂',
    '[thumb]': '👍',
    '[hi]': '👋',
    '[heart]': '❤️',
    '[congrat]': '🎉',

    // Serie Rocky
    '[rockyserious]': '😐',
    '[rockyloveit]': '😍',
    '[rockyproud]': '😎',
    '[rockycool]': '😎',

    // Serie Rosie
    '[rosiedislike]': '🙄',
    '[rosieawkward]': '😅',
    '[rosiekisskiss]': '💋',
    '[rosiecute]': '🥰',

    // Serie Jollie
    '[jolliekissingface]': '😘',
    '[jolliewow]': '😲',
    '[jolliespeechless]': '😶',
    '[jolliesatisfied]': '😌',

    // Serie Sage
    '[sagethink]': '🤔',
    '[sagefulfilled]': '😊',
    '[sageclever]': '🧠',
    '[sagemoney]': '💰',
};

export function replaceTikTokEmotes(message: string): string {
    if (!message) return message;

    let processedMessage = message;

    // Reemplazar cada shortcode con su emoji correspondiente
    for (const [shortcode, emoji] of Object.entries(TIKTOK_EMOTE_MAP)) {
        // Usar expresión regular global para reemplazar todas las ocurrencias
        const regex = new RegExp(shortcode.replace(/[[\]]/g, '\\$&'), 'g');
        processedMessage = processedMessage.replace(regex, emoji);
    }

    return processedMessage;
}
