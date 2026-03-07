jest.mock('../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        fatal: jest.fn()
    }
}));

jest.mock('../config', () => ({
    config: {
        nodeEnv: 'test',
        frontendUrl: 'http://localhost:3000',
        port: 4000,
        jwtSecret: 'test-secret',
        cookie: { secure: false, sameSite: 'lax', domain: 'localhost', maxAge: 86400000 }
    }
}));

jest.mock('../config/db', () => ({
    connectToDatabase: jest.fn().mockResolvedValue(undefined)
}));

const mockTwitchManager = {
    syncSubscriptionsOnStartup: jest.fn().mockResolvedValue(undefined)
};

jest.mock('../services/container', () => ({
    createContainer: jest.fn(() => ({
        chatManager: {},
        messageSenderService: {},
        connectionService: {},
        youtubeService: {},
        authController: {},
        webhookController: {},
        twitchManager: mockTwitchManager,
        userService: {}
    }))
}));

jest.mock('../app', () => ({
    createApp: jest.fn(() => ({
        handle: jest.fn()
    }))
}));

jest.mock('../socket/socket.handler', () => ({
    setupSocketHandlers: jest.fn()
}));

jest.mock('../services/cron/YouTubeSubscriptionRenewer', () => ({
    YouTubeSubscriptionRenewer: jest.fn().mockImplementation(() => ({
        start: jest.fn(),
        stop: jest.fn()
    }))
}));

const mockClose = jest.fn((cb?: () => void) => { cb?.(); });
const mockServer = { close: mockClose, listen: jest.fn() };

jest.mock('http', () => ({
    createServer: jest.fn(() => mockServer)
}));

jest.mock('../repositories/implementations/ConnectionRepository', () => ({
    ConnectionRepository: {
        stopCleanup: jest.fn()
    }
}));

jest.mock('../models/User.model', () => ({
    User: {
        findAll: jest.fn().mockResolvedValue([])
    }
}));

jest.mock('../utils/tokenUtils', () => ({
    hashToken: jest.fn((t: string) => `hash_${t}`)
}));

jest.mock('../services/security/EncryptionService', () => ({
    encryptionService: {
        isEncrypted: jest.fn().mockReturnValue(false),
        encrypt: jest.fn((t: string) => `enc_${t}`),
        decrypt: jest.fn((t: string) => t)
    }
}));

jest.mock('socket.io', () => ({
    Server: jest.fn().mockImplementation(() => ({
        attach: jest.fn(),
        close: jest.fn()
    }))
}));

import { gracefulShutdown, runStartupTasks } from '../server';
import { logger } from '../utils/logger';
import { ConnectionRepository } from '../repositories/implementations/ConnectionRepository';
import { User } from '../models/User.model';
import { encryptionService } from '../services/security/EncryptionService';

describe('server.ts — gracefulShutdown', () => {
    let mockProcessExit: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    afterEach(() => {
        mockProcessExit.mockRestore();
    });

    it('debería logear el inicio del cierre, detener servicios y llamar server.close', () => {
        gracefulShutdown();

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('cierre ordenado')
        );
        expect(ConnectionRepository.stopCleanup).toHaveBeenCalledTimes(1);
        expect(mockClose).toHaveBeenCalledTimes(1);
        expect(mockProcessExit).toHaveBeenCalledWith(0);
    });

    it('debería ser idempotente: si ya se inició el cierre, no vuelve a ejecutar nada', () => {
        gracefulShutdown();

        expect(ConnectionRepository.stopCleanup).not.toHaveBeenCalled();
        expect(mockClose).not.toHaveBeenCalled();
        expect(mockProcessExit).not.toHaveBeenCalled();
    });
});

describe('server.ts — runStartupTasks', () => {
    let mockProcessExit: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    afterEach(() => {
        mockProcessExit.mockRestore();
    });

    it('debería completar sin errores cuando no hay usuarios sin overlayToken', async () => {
        (User.findAll as jest.Mock).mockResolvedValue([]);

        await expect(runStartupTasks()).resolves.toBeUndefined();

        expect(mockTwitchManager.syncSubscriptionsOnStartup).toHaveBeenCalled();
        expect(User.findAll).toHaveBeenCalled();
    });

    it('debería generar y guardar overlayToken para usuarios que no lo tienen', async () => {
        const mockUser = {
            id: 'user-1',
            overlayToken: null,
            overlayTokenHash: null,
            save: jest.fn().mockResolvedValue(undefined)
        };
        (User.findAll as jest.Mock).mockResolvedValue([mockUser]);
        (encryptionService.isEncrypted as jest.Mock).mockReturnValue(false);
        (encryptionService.encrypt as jest.Mock).mockReturnValue('enc_token');

        await runStartupTasks();

        expect(mockUser.overlayToken).toBe('enc_token');
        expect(mockUser.overlayTokenHash).toMatch(/^hash_/);
        expect(mockUser.save).toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 'user-1' }),
            expect.stringContaining('overlayToken')
        );
    });

    it('debería reusar el overlayToken existente si ya está encriptado', async () => {
        const existingToken = 'already_encrypted_token';
        const mockUser = {
            id: 'user-2',
            overlayToken: existingToken,
            overlayTokenHash: null,
            save: jest.fn().mockResolvedValue(undefined)
        };
        (User.findAll as jest.Mock).mockResolvedValue([mockUser]);
        (encryptionService.isEncrypted as jest.Mock).mockReturnValue(true);
        (encryptionService.decrypt as jest.Mock).mockReturnValue('raw_token');

        await runStartupTasks();

        expect(mockUser.overlayToken).toBe(existingToken);
        expect(mockUser.save).toHaveBeenCalled();
    });

    it('debería logear error si syncSubscriptionsOnStartup falla (no propaga el error)', async () => {
        mockTwitchManager.syncSubscriptionsOnStartup.mockRejectedValueOnce(
            new Error('Twitch sync failed')
        );

        await expect(runStartupTasks()).resolves.toBeUndefined();

        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({ err: expect.any(Error) }),
            expect.stringContaining('Startup Tasks')
        );
    });
});