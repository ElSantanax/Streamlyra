import { YouTubePubSubParser } from '../YouTubePubSubParser';

describe('YouTubePubSubParser', () => {
    it('debería parsear un feed válido con entry', () => {
        const xml = `
            <feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015">
                <entry>
                    <yt:videoId>v123</yt:videoId>
                    <yt:channelId>c456</yt:channelId>
                    <title>Live stream</title>
                    <published>2024-01-01T00:00:00Z</published>
                    <updated>2024-01-01T01:00:00Z</updated>
                    <link href="http://example.com/v123"/>
                </entry>
            </feed>
        `;
        const result = YouTubePubSubParser.parseNotification(xml);
        expect(result).toMatchObject({
            videoId: 'v123',
            channelId: 'c456',
            title: 'Live stream'
        });
        expect(result?.publishedAt).toBeInstanceOf(Date);
    });

    it('debería retornar null para XML inválido', () => {
        const xml = '<invalid></invalid>';
        const result = YouTubePubSubParser.parseNotification(xml);
        expect(result).toBeNull();
    });

    it('debería retornar null para un feed vacío', () => {
        const result = YouTubePubSubParser.parseNotification('');
        expect(result).toBeNull();
    });
});
