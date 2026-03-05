import { PlatformSendHelper } from '../PlatformSendHelper';
import { ConnectionService } from '../../connection/ConnectionService';
import { Connection } from '../../../models/Connection.model';
import { logger } from '../../../utils/logger';
import axios from 'axios';
import { Platform } from '../../../constants/platforms';

jest.mock('../../connection/ConnectionService');
jest.mock('../../../models/Connection.model');
jest.mock('../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    }
}));
jest.mock('axios');

describe('PlatformSendHelper', () => {
    let helper: PlatformSendHelper;
    let mockConnectionService: jest.Mocked<ConnectionService>;

    const userId = 'user123';
    const platform = 'twitch' as Platform;

    beforeEach(() => {
        mockConnectionService = {
            getValidAccessToken: jest.fn(),
            forceTokenRefresh: jest.fn()
        } as unknown as jest.Mocked<ConnectionService>;

        helper = new PlatformSendHelper(mockConnectionService);
        jest.clearAllMocks();
    });

    describe('sendWithRetry', () => {
        it('debería enviar con éxito en el primer intento', async () => {
            const mockConnection = { id: 1 } as unknown as Connection;
            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('token123');

            const sendFn = jest.fn().mockResolvedValue({ someData: 'ok' });

            const result = await helper.sendWithRetry(platform, userId, sendFn);

            expect(result.success).toBe(true);
            expect((result as unknown as Record<string, unknown>).someData).toBe('ok');
            expect(sendFn).toHaveBeenCalledWith('token123', mockConnection);
        });

        it('debería retornar error si no hay conexión', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue(null);

            const sendFn = jest.fn();
            const result = await helper.sendWithRetry(platform, userId, sendFn);

            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('NOT_CONNECTED');
            expect(sendFn).not.toHaveBeenCalled();
        });

        it('debería retornar error si falla al obtener access token', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue({ id: 1 });
            mockConnectionService.getValidAccessToken.mockResolvedValue(null);

            const sendFn = jest.fn();
            const result = await helper.sendWithRetry(platform, userId, sendFn);

            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('INVALID_TOKEN');
        });

        it('debería reintentar si el primer intento falla con 401', async () => {
            const mockConnection = { id: 1 } as unknown as Connection;
            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue('old_token');
            mockConnectionService.forceTokenRefresh.mockResolvedValue('new_token');

            const error401 = { isAxiosError: true, response: { status: 401 } };
            (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

            const sendFn = jest.fn()
                .mockRejectedValueOnce(error401)
                .mockResolvedValueOnce({ afterRetry: true });

            const result = await helper.sendWithRetry(platform, userId, sendFn);

            expect(result.success).toBe(true);
            expect((result as unknown as Record<string, unknown>).afterRetry).toBe(true);
            expect(sendFn).toHaveBeenCalledTimes(2);
            expect(sendFn).toHaveBeenNthCalledWith(1, 'old_token', mockConnection);
            expect(sendFn).toHaveBeenNthCalledWith(2, 'new_token', mockConnection);
        });

        it('debería fallar si falla el reintento después de 401', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue({ id: 1 });
            mockConnectionService.getValidAccessToken.mockResolvedValue('old_token');
            mockConnectionService.forceTokenRefresh.mockResolvedValue('new_token');
            (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

            const sendFn = jest.fn()
                .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
                .mockRejectedValueOnce(new Error('Persistent error'));

            const result = await helper.sendWithRetry(platform, userId, sendFn);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Persistent error');
        });

        it('debería fallar si falla el refresco de token tras 401', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue({ id: 1 });
            mockConnectionService.getValidAccessToken.mockResolvedValue('old_token');
            mockConnectionService.forceTokenRefresh.mockResolvedValue(null);
            (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

            const sendFn = jest.fn().mockRejectedValue({ isAxiosError: true, response: { status: 401 } });

            const result = await helper.sendWithRetry(platform, userId, sendFn);

            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('TOKEN_REFRESH_FAILED');
        });

        it('debería manejar errores genéricos fuera de axios 401', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue({ id: 1 });
            mockConnectionService.getValidAccessToken.mockResolvedValue('token');

            const genericError = new Error('Generic error');
            const sendFn = jest.fn().mockRejectedValue(genericError);

            const result = await helper.sendWithRetry(platform, userId, sendFn);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Generic error');
            expect(logger.error).toHaveBeenCalled();
        });

        it('debería manejar el caso donde el result de sendFn es undefined', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue({ id: 1 });
            mockConnectionService.getValidAccessToken.mockResolvedValue('token');
            const sendFn = jest.fn().mockResolvedValue(undefined);

            const result = await helper.sendWithRetry(platform, userId, sendFn);
            expect(result.success).toBe(true);
        });

        it('debería manejar una plataforma desconocida para el nombre', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue({ id: 1 });
            mockConnectionService.getValidAccessToken.mockResolvedValue('token');
            const sendFn = jest.fn().mockResolvedValue({ ok: true });

            const result = await helper.sendWithRetry('unknown' as unknown as Platform, userId, sendFn);
            expect(result.platform).toBe('unknown');
        });
    });

    describe('retryWithRefreshedToken edge cases', () => {
        it('debería manejar errores que no son instancia de Error en el reintento', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue({ id: 1 });
            mockConnectionService.getValidAccessToken.mockResolvedValue('old');
            mockConnectionService.forceTokenRefresh.mockResolvedValue('new');
            (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

            const sendFn = jest.fn()
                .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
                .mockRejectedValueOnce('String error');

            const result = await helper.sendWithRetry(platform, userId, sendFn);
            expect(result.error).toBe('Error al enviar');
        });

        it('debería usar el código por defecto si el error no tiene código en el reintento', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue({ id: 1 });
            mockConnectionService.getValidAccessToken.mockResolvedValue('old');
            mockConnectionService.forceTokenRefresh.mockResolvedValue('new');
            (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

            const sendFn = jest.fn()
                .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
                .mockRejectedValueOnce(new Error('No code error'));

            const result = await helper.sendWithRetry(platform, userId, sendFn);
            expect(result.errorCode).toBe('TWITCH_RETRY_ERROR');
        });

        it('debería manejar undefined en el resultado del reintento', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue({ id: 1 });
            mockConnectionService.getValidAccessToken.mockResolvedValue('old');
            mockConnectionService.forceTokenRefresh.mockResolvedValue('new');
            (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

            const sendFn = jest.fn()
                .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
                .mockResolvedValueOnce(undefined);

            const result = await helper.sendWithRetry(platform, userId, sendFn);
            expect(result.success).toBe(true);
        });
    });

    describe('sanitizeErrorMessage', () => {
        it('debería ocultar tokens en los mensajes de error', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue({ id: 1 });
            mockConnectionService.getValidAccessToken.mockResolvedValue('token');

            const errorWithToken = new Error('Invalid credentials: token=abc123def456ghi789jkl012mno345pqr123');
            const sendFn = jest.fn().mockRejectedValue(errorWithToken);

            const result = await helper.sendWithRetry(platform, userId, sendFn);

            expect(result.error).toContain('[REDACTED]');
            expect(result.error).not.toContain('abc123def456');
        });

        it('debería ocultar tokens largos independientes', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue({ id: 1 });
            mockConnectionService.getValidAccessToken.mockResolvedValue('token');

            const errorWithLongToken = new Error('Auth failed for abc123def456ghi789jkl012mno345pqr');
            const sendFn = jest.fn().mockRejectedValue(errorWithLongToken);

            const result = await helper.sendWithRetry(platform, userId, sendFn);

            expect(result.error).toContain('[REDACTED]');
            expect(result.error).not.toContain('abc123def456');
        });
    });
});
