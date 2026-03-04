import tmi from 'tmi.js';
import { Server } from 'socket.io';
import { TwitchEventListener } from '../TwitchEventListener';
import { TwitchEventTransformer } from '../../transformers/TwitchEventTransformer';
import { SafeSocketEmitter } from '../../../../utils/SafeSocketEmitter';

jest.mock('../../../../utils/SafeSocketEmitter');
jest.mock('../../transformers/TwitchEventTransformer');

describe('TwitchEventListener', () => {
    let mockTransformer: jest.Mocked<TwitchEventTransformer>;
    let mockIo: jest.Mocked<Server>;
    let mockClient: jest.Mocked<tmi.Client>;
    let eventListener: TwitchEventListener;

    const userId = 'user123';

    beforeEach(() => {
        mockTransformer = new TwitchEventTransformer() as jest.Mocked<TwitchEventTransformer>;
        mockIo = {} as unknown as jest.Mocked<Server>;
        mockClient = {
            on: jest.fn(),
            removeListener: jest.fn(),
        } as unknown as jest.Mocked<tmi.Client>;

        eventListener = new TwitchEventListener(mockTransformer);

        jest.clearAllMocks();
    });

    describe('setupListeners', () => {
        it('debe limpiar listeners previos y configurar un listener para "message"', () => {
            const removeSpy = jest.spyOn(eventListener, 'removeListeners');

            eventListener.setupListeners(userId, mockClient, mockIo);

            expect(removeSpy).toHaveBeenCalledWith(userId, mockClient);
            expect(mockClient.on).toHaveBeenCalledWith('message', expect.any(Function));
        });

        it('el listener "message" configurado debe transformar el mensaje de chat y emitirlo', () => {
            eventListener.setupListeners(userId, mockClient, mockIo);

            // Extraer el callback pasado a .on
            const onMessageCallback = mockClient.on.mock.calls.find(call => (call[0] as unknown as string) === 'message')?.[1] as (...args: unknown[]) => void;
            expect(onMessageCallback).toBeDefined();

            // Ejecutar el callback extraído
            const mockTags = { username: 'sender1' } as tmi.ChatUserstate;
            const mockMessage = 'hello world';
            const transformedMock = { platform: 'twitch', message: 'hello world', payload: {} }; // Mock object

            mockTransformer.transformChatMessage.mockReturnValue(transformedMock as unknown as ReturnType<typeof mockTransformer.transformChatMessage>);

            onMessageCallback('channel1', mockTags, mockMessage, false);

            expect(mockTransformer.transformChatMessage).toHaveBeenCalledWith(mockTags, mockMessage);
            expect(SafeSocketEmitter.emitChatMessage).toHaveBeenCalledWith(mockIo, userId, transformedMock, 'twitch');
        });
    });

    describe('removeListeners', () => {
        it('debe no hacer nada si no existen listeners mapeados para el userId', () => {
            eventListener.removeListeners('nonexistent-user', mockClient);
            expect(mockClient.removeListener).not.toHaveBeenCalled();
        });

        it('debe remover el listener y limpiar el map si el usuario existe', () => {
            // Pre-configurar el listener
            eventListener.setupListeners(userId, mockClient, mockIo);

            // Verificar que está configurado
            const onMessageCallback = mockClient.on.mock.calls.find(call => (call[0] as unknown as string) === 'message')?.[1];

            // Limpiar
            eventListener.removeListeners(userId, mockClient);

            expect(mockClient.removeListener).toHaveBeenCalledWith('message', onMessageCallback);

            // Un segundo llamado ya no debe encontrar listener
            mockClient.removeListener.mockClear();
            eventListener.removeListeners(userId, mockClient);
            expect(mockClient.removeListener).not.toHaveBeenCalled();
        });
    });
});
