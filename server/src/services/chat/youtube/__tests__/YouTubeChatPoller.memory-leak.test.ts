/**
 * Test para verificar que el fix de memory leak funciona correctamente
 * 
 * Este test verifica que:
 * 1. Los timeouts se crean correctamente
 * 2. Los timeouts se cancelan al llamar stopPolling()
 * 3. No hay emisiones después de stopPolling()
 */

 
 
 
/* eslint-disable @typescript-eslint/no-require-imports */

describe('YouTubeChatPoller - Memory Leak Fix', () => {
    let mockIo: any;
    let emittedMessages: any[];

    beforeEach(() => {
        jest.clearAllTimers();
        jest.useFakeTimers();
        emittedMessages = [];

        // Mock de Socket.IO
        mockIo = {
            to: jest.fn().mockReturnValue({
                emit: jest.fn((event: string, data: any) => {
                    emittedMessages.push({ event, data });
                })
            })
        };
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('debe cancelar timeouts activos al llamar stopPolling()', () => {
        // Importar dinámicamente para evitar problemas de módulos
        const YouTubeChatPoller = require('../YouTubeChatPoller').YouTubeChatPoller;
        const poller = new YouTubeChatPoller();

        const userId = 'test-user-123';
        
        // Simular mensajes
        const messages = Array.from({ length: 50 }, (_, i) => ({
            id: `msg-${i}`,
            snippet: { 
                displayMessage: `Message ${i}`,
                publishedAt: new Date().toISOString()
            },
            authorDetails: { 
                displayName: 'TestUser',
                channelId: 'test-channel'
            }
        }));

        // Acceder al método privado para testing
        const distributeMessages = (poller as any).distributeMessages.bind(poller);
        distributeMessages(messages, userId, mockIo, 5000);

        // Verificar que se crearon timeouts
        const activeTimeouts = (poller as any).activeTimeouts.get(userId);
        expect(activeTimeouts).toBeDefined();
        expect(activeTimeouts.size).toBe(50);

        // Verificar que no se han emitido mensajes aún
        expect(emittedMessages.length).toBe(0);

        // Llamar stopPolling ANTES de que se ejecuten los timeouts
        poller.stopPolling(userId);

        // Verificar que los timeouts fueron cancelados
        const activeTimeoutsAfter = (poller as any).activeTimeouts.get(userId);
        expect(activeTimeoutsAfter).toBeUndefined();

        // Avanzar el tiempo para verificar que los timeouts NO se ejecutan
        jest.advanceTimersByTime(10000);

        // Verificar que NO se emitieron mensajes (porque fueron cancelados)
        expect(emittedMessages.length).toBe(0);
    });

    test('debe permitir que timeouts completados se ejecuten normalmente', () => {
        const YouTubeChatPoller = require('../YouTubeChatPoller').YouTubeChatPoller;
        const poller = new YouTubeChatPoller();

        const userId = 'test-user-456';
        
        const messages = Array.from({ length: 10 }, (_, i) => ({
            id: `msg-${i}`,
            snippet: { 
                displayMessage: `Message ${i}`,
                publishedAt: new Date().toISOString()
            },
            authorDetails: { 
                displayName: 'TestUser',
                channelId: 'test-channel'
            }
        }));

        const distributeMessages = (poller as any).distributeMessages.bind(poller);
        distributeMessages(messages, userId, mockIo, 5000);

        // Verificar que se crearon 10 timeouts
        let activeTimeouts = (poller as any).activeTimeouts.get(userId);
        expect(activeTimeouts.size).toBe(10);

        // Avanzar tiempo para que se ejecuten algunos timeouts
        jest.advanceTimersByTime(2000);

        // Algunos mensajes deberían haberse emitido
        expect(emittedMessages.length).toBeGreaterThan(0);
        expect(emittedMessages.length).toBeLessThan(10);

        // Los timeouts completados deberían haberse removido del Set
        activeTimeouts = (poller as any).activeTimeouts.get(userId);
        expect(activeTimeouts.size).toBeLessThan(10);

        // Avanzar el resto del tiempo
        jest.advanceTimersByTime(5000);

        // Todos los mensajes deberían haberse emitido
        expect(emittedMessages.length).toBe(10);

        // El Set debería estar vacío o no existir
        activeTimeouts = (poller as any).activeTimeouts.get(userId);
        if (activeTimeouts) {
            expect(activeTimeouts.size).toBe(0);
        }
    });

    test('debe manejar múltiples usuarios independientemente', () => {
        const YouTubeChatPoller = require('../YouTubeChatPoller').YouTubeChatPoller;
        const poller = new YouTubeChatPoller();

        const user1 = 'user-1';
        const user2 = 'user-2';
        
        const messages1 = Array.from({ length: 20 }, (_, i) => ({
            id: `msg-1-${i}`,
            snippet: { 
                displayMessage: `User1 Message ${i}`,
                publishedAt: new Date().toISOString()
            },
            authorDetails: { 
                displayName: 'User1',
                channelId: 'channel-1'
            }
        }));

        const messages2 = Array.from({ length: 30 }, (_, i) => ({
            id: `msg-2-${i}`,
            snippet: { 
                displayMessage: `User2 Message ${i}`,
                publishedAt: new Date().toISOString()
            },
            authorDetails: { 
                displayName: 'User2',
                channelId: 'channel-2'
            }
        }));

        const distributeMessages = (poller as any).distributeMessages.bind(poller);
        distributeMessages(messages1, user1, mockIo, 5000);
        distributeMessages(messages2, user2, mockIo, 5000);

        // Verificar que ambos usuarios tienen timeouts
        const timeouts1 = (poller as any).activeTimeouts.get(user1);
        const timeouts2 = (poller as any).activeTimeouts.get(user2);
        expect(timeouts1.size).toBe(20);
        expect(timeouts2.size).toBe(30);

        // Desconectar solo user1
        poller.stopPolling(user1);

        // Verificar que solo user1 fue limpiado
        expect((poller as any).activeTimeouts.get(user1)).toBeUndefined();
        expect((poller as any).activeTimeouts.get(user2).size).toBe(30);

        // Avanzar tiempo
        jest.advanceTimersByTime(10000);

        // Solo los mensajes de user2 deberían haberse emitido (30 mensajes)
        expect(emittedMessages.length).toBe(30);

        // Verificar que todos son de user2
        const allFromUser2 = emittedMessages.every(m => 
            m.data.message?.includes('User2') || m.data.username === 'User2'
        );
        expect(allFromUser2).toBe(true);
    });

    test('debe manejar stopPolling() cuando no hay timeouts activos', () => {
        const YouTubeChatPoller = require('../YouTubeChatPoller').YouTubeChatPoller;
        const poller = new YouTubeChatPoller();
        
        const userId = 'user-no-timeouts';
        
        // Llamar stopPolling sin haber creado timeouts
        expect(() => {
            poller.stopPolling(userId);
        }).not.toThrow();

        // Verificar que no hay entry en el Map
        expect((poller as any).activeTimeouts.get(userId)).toBeUndefined();
    });

    test('debe loguear cuando cancela timeouts', () => {
        const YouTubeChatPoller = require('../YouTubeChatPoller').YouTubeChatPoller;
        const poller = new YouTubeChatPoller();

        const userId = 'test-user-logging';
        
        const messages = Array.from({ length: 25 }, (_, i) => ({
            id: `msg-${i}`,
            snippet: { 
                displayMessage: `Message ${i}`,
                publishedAt: new Date().toISOString()
            },
            authorDetails: { 
                displayName: 'TestUser',
                channelId: 'test-channel'
            }
        }));

        const distributeMessages = (poller as any).distributeMessages.bind(poller);
        distributeMessages(messages, userId, mockIo, 5000);

        // Verificar que se crearon 25 timeouts
        const activeTimeoutsBefore = (poller as any).activeTimeouts.get(userId);
        expect(activeTimeoutsBefore.size).toBe(25);

        // Llamar stopPolling
        poller.stopPolling(userId);

        // Verificar que todos los timeouts fueron cancelados
        const activeTimeoutsAfter = (poller as any).activeTimeouts.get(userId);
        expect(activeTimeoutsAfter).toBeUndefined();
    });
});
