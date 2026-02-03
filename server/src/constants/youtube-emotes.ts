/**
 * Mapeo de emotes nativos de YouTube a rutas de imágenes locales
 * Los emotes de YouTube vienen como shortcodes :nombre: en el mensaje
 * Este diccionario los convierte a rutas de imágenes para renderizado
 */

export const YOUTUBE_EMOTE_MAP: Record<string, string> = {
    // Emotes con nombres descriptivos largos
    ':hand-pink-waving:': '/icons/youtube/hand-pink-waving.png',
    ':face-blue-smiling:': '/icons/youtube/face-blue-smiling.png',
    ':face-red-droopy-eyes:': '/icons/youtube/face-red-droopy-eyes.png',
    ':face-purple-crying:': '/icons/youtube/face-purple-crying.png',
    ':text-green-game-over:': '/icons/youtube/text-green-game-over.png',
    ':person-turqouise-waving:': '/icons/youtube/person-turqouise-waving.png',
    ':face-orange-frowning:': '/icons/youtube/face-orange-frowning.png',
    ':face-green-smiling:': '/icons/youtube/face-green-smiling.png',
    ':eyes-purple-crying:': '/icons/youtube/eyes-purple-crying.png',
    ':cat-orange-whistling:': '/icons/youtube/cat-orange-whistling.png',
    ':hand-orange-covering-eyes:': '/icons/youtube/hand-orange-covering-eyes.png',
    ':body-blue-raised-arms:': '/icons/youtube/body-blue-raised-arms.png',
    ':face-pink-tears:': '/icons/youtube/face-pink-tears.png',
    ':glasses-purple-yellow-diamond:': '/icons/youtube/glasses-purple-yellow-diamond.png',
    ':face-purple-wide-eyes:': '/icons/youtube/face-purple-wide-eyes.png',
    ':face-fuchsia-poop-shape:': '/icons/youtube/face-fuchsia-poop-shape.png',
    ':face-fuchsia-wide-eyes:': '/icons/youtube/face-fuchsia-wide-eyes.png',
    ':face-red-heart-shape:': '/icons/youtube/face-red-heart-shape.png',
    ':face-orange-biting-nails:': '/icons/youtube/face-orange-biting-nails.png',
    ':face-fuchsia-tongue-out:': '/icons/youtube/face-fuchsia-tongue-out.png',
    ':face-orange-raised-eyebrow:': '/icons/youtube/face-orange-raised-eyebrow.png',
    ':face-blue-wide-eyes:': '/icons/youtube/face-blue-wide-eyes.png',
    ':trophy-yellow-smiling:': '/icons/youtube/trophy-yellow-smiling.png',
    ':eyes-pink-heart-shape:': '/icons/youtube/eyes-pink-heart-shape.png',
    ':face-turquoise-covering-eyes:': '/icons/youtube/face-turquoise-covering-eyes.png',
    ':hand-green-crystal-ball:': '/icons/youtube/hand-green-crystal-ball.png',
    ':face-turquoise-drinking-coffee:': '/icons/youtube/face-turquoise-drinking-coffee.png',
    ':body-green-covering-eyes:': '/icons/youtube/body-green-covering-eyes.png',
    ':goat-turquoise-white-horns:': '/icons/youtube/goat-turquoise-white-horns.png',
    ':hand-purple-blue-peace:': '/icons/youtube/hand-purple-blue-peace.png',
    ':face-blue-question-mark:': '/icons/youtube/face-blue-question-mark.png',
    ':face-blue-covering-eyes:': '/icons/youtube/face-blue-covering-eyes.png',
    ':face-purple-smiling-fangs:': '/icons/youtube/face-purple-smiling-fangs.png',
    ':face-purple-sweating:': '/icons/youtube/face-purple-sweating.png',
    ':face-purple-smiling-tears:': '/icons/youtube/face-purple-smiling-tears.png',
    ':face-blue-star-eyes:': '/icons/youtube/face-blue-star-eyes.png',
    ':face-blue-heart-eyes:': '/icons/youtube/face-blue-heart-eyes.png',
    ':face-blue-three-eyes:': '/icons/youtube/face-blue-three-eyes.png',
    ':face-blue-droopy-eyes:': '/icons/youtube/face-blue-droopy-eyes.png',
    ':planet-orange-purple-ring:': '/icons/youtube/planet-orange-purple-ring.png',
    ':face-turquoise-speaker-shape:': '/icons/youtube/face-turquoise-speaker-shape.png',
    ':octopus-red-waving:': '/icons/youtube/octopus-red-waving.png',
    ':pillow-turquoise-hot-chocolate:': '/icons/youtube/pillow-turquoise-hot-chocolate.png',
    ':hourglass-purple-sand-orange:': '/icons/youtube/hourglass-purple-sand-orange.png',
    ':fish-orange-wide-eyes:': '/icons/youtube/fish-orange-wide-eyes.png',
    ':popcorn-yellow-striped-smile:': '/icons/youtube/popcorn-yellow-striped-smile.png',
    ':penguin-blue-waving-tear:': '/icons/youtube/penguin-blue-waving-tear.png',
    ':clock-turquoise-looking-up:': '/icons/youtube/clock-turquoise-looking-up.png',
    ':face-red-smiling-live:': '/icons/youtube/face-red-smiling-live.png',
    ':hands-yellow-heart-red:': '/icons/youtube/hands-yellow-heart-red.png',
    ':volcano-green-lava-orange:': '/icons/youtube/volcano-green-lava-orange.png',
    ':person-turquoise-waving-speech:': '/icons/youtube/person-turquoise-waving-speech.png',
    ':face-orange-tv-shape:': '/icons/youtube/face-orange-tv-shape.png',
    ':face-blue-spam-shape:': '/icons/youtube/face-blue-spam-shape.png',
    ':face-fuchsia-flower-shape:': '/icons/youtube/face-fuchsia-flower-shape.png',
    ':person-blue-holding-pencil:': '/icons/youtube/person-blue-holding-pencil.png',
    ':body-turquoise-yoga-pose:': '/icons/youtube/body-turquoise-yoga-pose.png',
    ':location-yellow-teal-bars:': '/icons/youtube/location-yellow-teal-bars.png',
    ':person-turquoise-writing-headphones:': '/icons/youtube/person-turquoise-writing-headphones.png',
    ':person-turquoise-wizard-wand:': '/icons/youtube/person-turquoise-wizard-wand.png',
    ':person-blue-eating-spaghetti:': '/icons/youtube/person-blue-eating-spaghetti.png',
    ':face-turquoise-music-note:': '/icons/youtube/face-turquoise-music-note.png',
    ':person-pink-swaying-hair:': '/icons/youtube/person-pink-swaying-hair.png',
    ':person-blue-speaking-microphone:': '/icons/youtube/person-blue-speaking-microphone.png',
    ':rocket-red-countdown-liftoff:': '/icons/youtube/rocket-red-countdown-liftoff.png',
    ':face-purple-rain-drops:': '/icons/youtube/face-purple-rain-drops.png',
    ':face-pink-drinking-tea:': '/icons/youtube/face-pink-drinking-tea.png',
    ':person-purple-stage-event:': '/icons/youtube/person-purple-stage-event.png',
    ':face-purple-open-box:': '/icons/youtube/face-purple-open-box.png',
    ':person-yellow-podium-blue:': '/icons/youtube/person-yellow-podium-blue.png',
    ':baseball-white-cap-out:': '/icons/youtube/baseball-white-cap-out.png',
    ':whistle-red-blow:': '/icons/youtube/whistle-red-blow.png',
    ':person-turquoise-crowd-surf:': '/icons/youtube/person-turquoise-crowd-surf.png',
    ':finger-red-number-one:': '/icons/youtube/finger-red-number-one.png',
    ':text-yellow-goal:': '/icons/youtube/text-yellow-goal.png',
    ':medal-yellow-first-red:': '/icons/youtube/medal-yellow-first-red.png',
    ':person-blue-wheelchair-race:': '/icons/youtube/person-blue-wheelchair-race.png',
    ':card-red-penalty:': '/icons/youtube/card-red-penalty.png',
    ':stopwatch-blue-hand-timer:': '/icons/youtube/stopwatch-blue-hand-timer.png',

    // Emotes con nombres cortos (COVID-19 y otros especiales)
    ':yt:': '/icons/youtube/yt.png',
    ':oops:': '/icons/youtube/oops.png',
    ':buffering:': '/icons/youtube/buffering.png',
    ':stayhome:': '/icons/youtube/stayhome.png',
    ':dothefive:': '/icons/youtube/dothefive.png',
    ':elbowbump:': '/icons/youtube/elbowbump.png',
    ':goodvibes:': '/icons/youtube/goodvibes.png',
    ':thanksdoc:': '/icons/youtube/thanksdoc.png',
    ':videocall:': '/icons/youtube/videocall.png',
    ':virtualhug:': '/icons/youtube/virtualhug.png',
    ':yougotthis:': '/icons/youtube/yougotthis.png',
    ':sanitizer:': '/icons/youtube/sanitizer.png',
    ':takeout:': '/icons/youtube/takeout.png',
    ':hydrate:': '/icons/youtube/hydrate.png',
    ':chillwcat:': '/icons/youtube/chillwcat.png',
    ':chillwdog:': '/icons/youtube/chillwdog.png',
    ':elbowcough:': '/icons/youtube/elbowcough.png',
    ':learning:': '/icons/youtube/learning.png',
    ':washhands:': '/icons/youtube/washhands.png',
    ':socialdist:': '/icons/youtube/socialdist.png',
    ':shelterin:': '/icons/youtube/shelterin.png',
};

interface EmoteMatch {
    shortcode: string;
    url: string;
    start: number;
    end: number;
}

export function parseYouTubeEmotes(message: string): Array<{
    id: string;
    name: string;
    url: string;
    positions: Array<[number, number]>;
}> {
    if (!message) return [];

    const emoteMatches: EmoteMatch[] = [];

    // Regex para encontrar todos los shortcodes :nombre:
    const emoteRegex = /:([\w-]+):/g;
    let match;

    while ((match = emoteRegex.exec(message)) !== null) {
        const shortcode = match[0]; // :nombre:
        const emoteName = match[1]; // nombre
        const fullShortcode = `:${emoteName}:`;

        // Verificar si existe en nuestro mapeo
        if (YOUTUBE_EMOTE_MAP[fullShortcode]) {
            emoteMatches.push({
                shortcode: fullShortcode,
                url: YOUTUBE_EMOTE_MAP[fullShortcode],
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
