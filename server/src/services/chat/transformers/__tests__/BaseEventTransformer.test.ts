import { BaseEventTransformer } from '../BaseEventTransformer';
import { NormalizedChatMessage } from '../EventTransformer';
import { Platform } from '../../../../constants/platforms';

class MockEventTransformer extends BaseEventTransformer {
    protected readonly platformName = 'mock';

    transformMessage(data: { id: string, user: string, message: string }): NormalizedChatMessage {
        return {
            id: this.createMessageId('chat', data.id),
            platform: 'twitch' as Platform,
            user: this.normalizeUsername(data.user),
            message: data.message,
            time: this.formatTime(new Date()),
            color: '#000'
        };
    }

    transformSpecialEvent(data: { id: string, msg: string }): NormalizedChatMessage {
        return {
            id: this.createMessageId('special', data.id),
            platform: 'twitch' as Platform,
            user: 'system',
            message: '',
            specialMessage: data.msg,
            time: this.formatTime(new Date()),
            color: '#000',
            isSpecial: true
        };
    }

    // Expose protected methods for testing
    testFormatTime(date: Date) { return this.formatTime(date); }
    testCreateMessageId(prefix: string, id: string | number) { return this.createMessageId(prefix, id); }
    testGetCurrentTimestamp() { return this.getCurrentTimestamp(); }
    testNormalizeUsername(username: string) { return this.normalizeUsername(username); }
    testIsValidMessage(message: string) { return this.isValidMessage(message); }
}

describe('BaseEventTransformer', () => {
    let transformer: MockEventTransformer;

    beforeEach(() => {
        transformer = new MockEventTransformer();
    });

    it('debería formatear la hora correctamente', () => {
        const date = new Date('2026-03-05T15:30:00');
        const time = transformer.testFormatTime(date);
        // El formato depende del locale de la máquina, pero usualmente incluirá 15:30 o 03:30
        expect(time).toMatch(/\d{2}:\d{2}/);
    });

    it('debería crear un ID de mensaje con el prefijo y plataforma', () => {
        const id = transformer.testCreateMessageId('test', '123');
        expect(id).toMatch(/^mock_test_123_\d+/);
    });

    it('debería obtener un timestamp en ISO format', () => {
        const ts = transformer.testGetCurrentTimestamp();
        expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('debería normalizar el nombre de usuario', () => {
        const normalized = transformer.testNormalizeUsername('  User Name! @123  ');
        expect(normalized).toBe('username123');
    });

    it('debería validar mensajes correctamente', () => {
        expect(transformer.testIsValidMessage('hola')).toBe(true);
        expect(transformer.testIsValidMessage('  ')).toBe(false);
        expect(transformer.testIsValidMessage(null as unknown as string)).toBe(false);
    });
});
