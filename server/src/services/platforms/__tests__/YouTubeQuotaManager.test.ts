import { YouTubeQuotaManager } from '../YouTubeQuotaManager';
import { YouTubeQuota } from '../../../models/YouTubeQuota.model';

jest.mock('../../../models/YouTubeQuota.model');
jest.mock('../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe('YouTubeQuotaManager', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
        jest.clearAllMocks();
    });

    describe('getInstance', () => {
        it('debe retornar la misma instancia (singleton)', () => {
            const instance1 = YouTubeQuotaManager.getInstance();
            const instance2 = YouTubeQuotaManager.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe('hasQuota', () => {
        it('debe retornar true en desarrollo sin verificar cuota', async () => {
            process.env.NODE_ENV = 'development';
            (YouTubeQuota.findOne as jest.Mock).mockResolvedValue(null);
            (YouTubeQuota.create as jest.Mock).mockResolvedValue({});

            const manager = YouTubeQuotaManager.getInstance();
            const result = await manager.hasQuota(100);

            expect(result).toBe(true);
        });
    });

    describe('getStatus', () => {
        it('debe retornar estado con propiedades correctas', async () => {
            (YouTubeQuota.findOne as jest.Mock).mockResolvedValue({
                unitsUsed: 5000,
                isExhausted: false,
                exhaustedUntil: null
            });
            (YouTubeQuota.create as jest.Mock).mockResolvedValue({});

            const manager = YouTubeQuotaManager.getInstance();
            const status = await manager.getStatus();

            expect(status).toHaveProperty('unitsUsed');
            expect(status).toHaveProperty('limit');
            expect(status).toHaveProperty('remaining');
            expect(status).toHaveProperty('percentUsed');
            expect(typeof status.percentUsed).toBe('number');
        });
    });

    describe('getAdaptiveInterval', () => {
        it('debe retornar intervalo numérico válido', async () => {
            (YouTubeQuota.findOne as jest.Mock).mockResolvedValue({
                unitsUsed: 2000,
                isExhausted: false,
                exhaustedUntil: null
            });
            (YouTubeQuota.create as jest.Mock).mockResolvedValue({});

            const manager = YouTubeQuotaManager.getInstance();
            const interval = await manager.getAdaptiveInterval(1000);

            expect(typeof interval).toBe('number');
            expect(interval).toBeGreaterThan(0);
        });
    });
});
