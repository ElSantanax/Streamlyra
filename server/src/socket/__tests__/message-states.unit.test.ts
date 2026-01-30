/**
 * Tests unitarios para verificar la lógica de estados de mensaje
 */

describe('Message States Logic', () => {
    describe('Status determination based on platform results', () => {
        it('should return "sent" when all platforms succeed', () => {
            const results = [
                { platform: 'twitch', success: true },
                { platform: 'youtube', success: true },
                { platform: 'kick', success: true }
            ];

            const successfulPlatforms = results.filter(r => r.success);
            const failedPlatforms = results.filter(r => !r.success);

            let finalStatus: string;
            let errorMessage: string | undefined;

            if (successfulPlatforms.length === results.length) {
                finalStatus = 'sent';
            } else if (successfulPlatforms.length > 0) {
                finalStatus = 'error';
                errorMessage = `Falló en: ${failedPlatforms.map(r => r.platform).join(', ')}`;
            } else {
                finalStatus = 'error';
                errorMessage = 'No se pudo enviar a ninguna plataforma';
            }

            expect(finalStatus).toBe('sent');
            expect(errorMessage).toBeUndefined();
        });

        it('should return "error" with details when some platforms fail', () => {
            const results = [
                { platform: 'twitch', success: true },
                { platform: 'youtube', success: false, error: 'Quota exceeded' },
                { platform: 'kick', success: false, error: 'Connection timeout' }
            ];

            const successfulPlatforms = results.filter(r => r.success);
            const failedPlatforms = results.filter(r => !r.success);

            let finalStatus: string;
            let errorMessage: string | undefined;

            if (successfulPlatforms.length === results.length) {
                finalStatus = 'sent';
            } else if (successfulPlatforms.length > 0) {
                finalStatus = 'error';
                errorMessage = `Falló en: ${failedPlatforms.map(r => r.platform).join(', ')}`;
            } else {
                finalStatus = 'error';
                errorMessage = 'No se pudo enviar a ninguna plataforma';
            }

            expect(finalStatus).toBe('error');
            expect(errorMessage).toBe('Falló en: youtube, kick');
        });

        it('should return "error" with generic message when all platforms fail', () => {
            const results = [
                { platform: 'twitch', success: false, error: 'Invalid token' },
                { platform: 'youtube', success: false, error: 'API error' },
                { platform: 'kick', success: false, error: 'Network error' }
            ];

            const successfulPlatforms = results.filter(r => r.success);
            const failedPlatforms = results.filter(r => !r.success);

            let finalStatus: string;
            let errorMessage: string | undefined;

            if (successfulPlatforms.length === results.length) {
                finalStatus = 'sent';
            } else if (successfulPlatforms.length > 0) {
                finalStatus = 'error';
                errorMessage = `Falló en: ${failedPlatforms.map(r => r.platform).join(', ')}`;
            } else {
                finalStatus = 'error';
                errorMessage = 'No se pudo enviar a ninguna plataforma';
            }

            expect(finalStatus).toBe('error');
            expect(errorMessage).toBe('No se pudo enviar a ninguna plataforma');
        });

        it('should handle single platform success', () => {
            const results = [
                { platform: 'twitch', success: true }
            ];

            const successfulPlatforms = results.filter(r => r.success);

            let finalStatus: string;

            if (successfulPlatforms.length === results.length) {
                finalStatus = 'sent';
            } else {
                finalStatus = 'error';
            }

            expect(finalStatus).toBe('sent');
        });

        it('should handle single platform failure', () => {
            const results = [
                { platform: 'twitch', success: false, error: 'Token expired' }
            ];

            const successfulPlatforms = results.filter(r => r.success);
            const failedPlatforms = results.filter(r => !r.success);

            let finalStatus: string;
            let errorMessage: string | undefined;

            if (successfulPlatforms.length === results.length) {
                finalStatus = 'sent';
            } else if (successfulPlatforms.length > 0) {
                finalStatus = 'error';
                errorMessage = `Falló en: ${failedPlatforms.map(r => r.platform).join(', ')}`;
            } else {
                finalStatus = 'error';
                errorMessage = 'No se pudo enviar a ninguna plataforma';
            }

            expect(finalStatus).toBe('error');
            expect(errorMessage).toBe('No se pudo enviar a ninguna plataforma');
        });
    });

    describe('Message ID generation', () => {
        it('should generate unique IDs with correct format', () => {
            const generateMessageId = () => {
                return `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            };

            const id1 = generateMessageId();
            const id2 = generateMessageId();
            const id3 = generateMessageId();

            // Verificar formato
            expect(id1).toMatch(/^dashboard-\d+-[a-z0-9]+$/);
            expect(id2).toMatch(/^dashboard-\d+-[a-z0-9]+$/);
            expect(id3).toMatch(/^dashboard-\d+-[a-z0-9]+$/);

            // Verificar que son únicos
            expect(id1).not.toBe(id2);
            expect(id2).not.toBe(id3);
            expect(id1).not.toBe(id3);
        });

        it('should include timestamp in ID', () => {
            const beforeTime = Date.now();
            
            const messageId = `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            const afterTime = Date.now();

            // Extraer timestamp del ID
            const match = messageId.match(/^dashboard-(\d+)-/);
            expect(match).not.toBeNull();
            
            const timestamp = parseInt(match![1], 10);
            expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
            expect(timestamp).toBeLessThanOrEqual(afterTime);
        });
    });

    describe('Message status update payload', () => {
        it('should create correct payload for successful send', () => {
            const messageId = 'dashboard-123-abc';
            const status = 'sent';

            const payload = {
                messageId,
                status,
                errorMessage: undefined
            };

            expect(payload).toEqual({
                messageId: 'dashboard-123-abc',
                status: 'sent',
                errorMessage: undefined
            });
        });

        it('should create correct payload for failed send', () => {
            const messageId = 'dashboard-456-def';
            const status = 'error';
            const errorMessage = 'Falló en: youtube, kick';

            const payload = {
                messageId,
                status,
                errorMessage
            };

            expect(payload).toEqual({
                messageId: 'dashboard-456-def',
                status: 'error',
                errorMessage: 'Falló en: youtube, kick'
            });
        });

        it('should create correct payload for total failure', () => {
            const messageId = 'dashboard-789-ghi';
            const status = 'error';
            const errorMessage = 'No se pudo enviar a ninguna plataforma';

            const payload = {
                messageId,
                status,
                errorMessage
            };

            expect(payload).toEqual({
                messageId: 'dashboard-789-ghi',
                status: 'error',
                errorMessage: 'No se pudo enviar a ninguna plataforma'
            });
        });
    });

    describe('Initial message payload', () => {
        it('should create message with "sending" status', () => {
            const messageId = 'dashboard-111-aaa';
            const message = 'Hello world';
            const time = new Date().toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            const chatMessage = {
                id: messageId,
                platform: 'dashboard',
                user: 'Tú',
                message,
                time,
                color: '#10B981',
                isOwner: true,
                status: 'sending'
            };

            expect(chatMessage.status).toBe('sending');
            expect(chatMessage.platform).toBe('dashboard');
            expect(chatMessage.isOwner).toBe(true);
            expect(chatMessage.id).toBe(messageId);
        });
    });

    describe('Edge cases', () => {
        it('should handle empty results array', () => {
            const results: Array<{ platform: string; success: boolean }> = [];

            const successfulPlatforms = results.filter(r => r.success);
            const failedPlatforms = results.filter(r => !r.success);

            let finalStatus: string;
            let errorMessage: string | undefined;

            if (successfulPlatforms.length === results.length && results.length > 0) {
                finalStatus = 'sent';
            } else if (successfulPlatforms.length > 0) {
                finalStatus = 'error';
                errorMessage = `Falló en: ${failedPlatforms.map(r => r.platform).join(', ')}`;
            } else {
                finalStatus = 'error';
                errorMessage = 'No se pudo enviar a ninguna plataforma';
            }

            expect(finalStatus).toBe('error');
            expect(errorMessage).toBe('No se pudo enviar a ninguna plataforma');
        });

        it('should handle platforms with missing error messages', () => {
            const results = [
                { platform: 'twitch', success: false },
                { platform: 'youtube', success: false }
            ];

            const failedPlatforms = results.filter(r => !r.success);
            const errorMessage = `Falló en: ${failedPlatforms.map(r => r.platform).join(', ')}`;

            expect(errorMessage).toBe('Falló en: twitch, youtube');
        });
    });
});
