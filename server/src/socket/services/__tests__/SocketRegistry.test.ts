import { SocketRegistry } from '../SocketRegistry';

describe('SocketRegistry', () => {
    let registry: SocketRegistry;

    beforeEach(() => {
        registry = new SocketRegistry();
    });

    describe('register', () => {
        it('debe registrar el primer socket de un usuario', () => {
            const result = registry.register('socket-1', 'user-1');

            expect(result.isFirstSocket).toBe(true);
            expect(result.currentCount).toBe(1);
        });

        it('debe registrar múltiples sockets del mismo usuario', () => {
            registry.register('socket-1', 'user-1');
            const result = registry.register('socket-2', 'user-1');

            expect(result.isFirstSocket).toBe(false);
            expect(result.currentCount).toBe(2);
        });

        it('debe retornar el mismo resultado si se registra el mismo socket', () => {
            registry.register('socket-1', 'user-1');
            const result = registry.register('socket-1', 'user-1');

            expect(result.isFirstSocket).toBe(true);
            expect(result.currentCount).toBe(1);
        });
    });

    describe('remove', () => {
        it('debe remover socket y marcar como último cuando no quedan más', () => {
            registry.register('socket-1', 'user-1');
            const result = registry.remove('socket-1');

            expect(result.userId).toBe('user-1');
            expect(result.isLastSocket).toBe(true);
            expect(result.remainingCount).toBe(0);
        });

        it('no debe marcar como último cuando quedan más sockets', () => {
            registry.register('socket-1', 'user-1');
            registry.register('socket-2', 'user-1');
            const result = registry.remove('socket-1');

            expect(result.userId).toBe('user-1');
            expect(result.isLastSocket).toBe(false);
            expect(result.remainingCount).toBe(1);
        });

        it('debe retornar undefined cuando el socket no existe', () => {
            const result = registry.remove('socket-inexistente');

            expect(result.userId).toBeUndefined();
            expect(result.isLastSocket).toBe(false);
        });
    });

    describe('getUserId', () => {
        it('debe retornar el userId asociado al socket', () => {
            registry.register('socket-1', 'user-1');

            expect(registry.getUserId('socket-1')).toBe('user-1');
        });

        it('debe retornar undefined para socket no registrado', () => {
            expect(registry.getUserId('socket-inexistente')).toBeUndefined();
        });
    });

    describe('hasUser', () => {
        it('debe retornar true si el usuario tiene sockets activos', () => {
            registry.register('socket-1', 'user-1');

            expect(registry.hasUser('user-1')).toBe(true);
        });

        it('debe retornar false si el usuario no tiene sockets', () => {
            expect(registry.hasUser('user-1')).toBe(false);
        });
    });
});
