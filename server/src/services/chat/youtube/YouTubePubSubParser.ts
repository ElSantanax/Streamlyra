import { XMLParser } from 'fast-xml-parser';
import { logger } from '../../../utils/logger';

export interface YouTubeNotification {
    videoId: string;
    channelId: string;
    title: string;
    publishedAt: Date;
    updatedAt: Date;
    link: string;
}

interface YouTubePubSubEntry {
    'yt:videoId': string;
    'yt:channelId': string;
    title: string;
    published: string;
    updated: string;
    link?: {
        '@_href': string;
    };
}

interface YouTubePubSubFeed {
    feed?: {
        entry?: YouTubePubSubEntry;
    };
}

export class YouTubePubSubParser {
    private static parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_'
    });

    static parseNotification(xmlBody: string): YouTubeNotification | null {
        try {
            const result = this.parser.parse(xmlBody) as YouTubePubSubFeed;
            const entry = result.feed?.entry;

            if (!entry) {
                logger.warn('No se encontró entry en el feed de YouTube');
                return null;
            }

            const videoId = entry['yt:videoId'];
            const channelId = entry['yt:channelId'];
            const title = entry.title;
            const publishedAt = entry.published;
            const updatedAt = entry.updated;
            const link = entry.link?.['@_href'];

            if (!videoId || !channelId) {
                logger.warn({ entry }, 'Faltan campos requeridos en la notificación');
                return null;
            }

            return {
                videoId,
                channelId,
                title: title || 'Sin título',
                publishedAt: new Date(publishedAt),
                updatedAt: new Date(updatedAt),
                link: link || `https://www.youtube.com/watch?v=${videoId}`
            };
        } catch (error) {
            logger.error({ err: error, xmlBody }, 'Error al parsear notificación de YouTube');
            return null;
        }
    }
}