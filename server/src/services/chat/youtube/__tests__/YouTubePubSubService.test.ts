import axios from 'axios';
import crypto from 'crypto';
import { youtubePubSubService } from '../YouTubePubSubService';
import { YouTubeSubscription } from '../../../../models/YouTubeSubscription.model';
import { encryptionService } from '../../../security/EncryptionService';

jest.mock('axios');
jest.mock('../../../../models/YouTubeSubscription.model');
jest.mock('../../../security/EncryptionService');
jest.mock('../../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    }
}));

describe('YouTubePubSubService', () => {
    const userId = 'user_1';
    const channelId = 'channel_1';
    const secret = 'shared-secret-123';
    const encryptedSecret = 'encrypted-secret';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('verifySignature', () => {
        it('debería verificar una firma correcta', () => {
            const body = '{"test": "data"}';
            const hmac = crypto.createHmac('sha1', secret);
            hmac.update(body);
            const signature = 'sha1=' + hmac.digest('hex');

            const result = youtubePubSubService.verifySignature(secret, body, signature);
            expect(result).toBe(true);
        });

        it('debería rechazar una firma inválida', () => {
            const result = youtubePubSubService.verifySignature(secret, 'wrong body', 'sha1=wrong');
            expect(result).toBe(false);
        });
    });

    describe('subscribe', () => {
        it('debería crear una nueva suscripción si no existe', async () => {
            (YouTubeSubscription.findOne as jest.Mock).mockResolvedValue(null);
            (axios.post as jest.Mock).mockResolvedValue({ status: 202 });
            (encryptionService.encrypt as jest.Mock).mockReturnValue(encryptedSecret);

            await youtubePubSubService.subscribe(userId, channelId);

            expect(YouTubeSubscription.create).toHaveBeenCalledWith(expect.objectContaining({
                userId,
                channelId,
                status: 'pending'
            }));
            expect(axios.post).toHaveBeenCalled();
        });

        it('debería actualizar la suscripción existente si el estado no es activo', async () => {
            const mockSub = {
                status: 'expired',
                update: jest.fn()
            };
            (YouTubeSubscription.findOne as jest.Mock).mockResolvedValue(mockSub);
            (axios.post as jest.Mock).mockResolvedValue({ status: 204 });

            await youtubePubSubService.subscribe(userId, channelId);

            expect(mockSub.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'pending'
            }));
        });

        it('debería omitir si ya está activa o pendiente', async () => {
            (YouTubeSubscription.findOne as jest.Mock).mockResolvedValue({ status: 'verified' });

            await youtubePubSubService.subscribe(userId, channelId);

            expect(axios.post).not.toHaveBeenCalled();
            expect(YouTubeSubscription.create).not.toHaveBeenCalled();
        });
    });

    describe('unsubscribe', () => {
        it('debería llamar al hub y marcar como expirada', async () => {
            const mockSub = {
                topicUrl: 'topic',
                callbackUrl: 'callback',
                update: jest.fn()
            };
            (YouTubeSubscription.findOne as jest.Mock).mockResolvedValue(mockSub);
            (axios.post as jest.Mock).mockResolvedValue({ status: 202 });

            await youtubePubSubService.unsubscribe(userId, channelId);

            expect(axios.post).toHaveBeenCalledWith(expect.any(String), expect.any(URLSearchParams), expect.any(Object));
            expect(mockSub.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'expired'
            }));
        });
    });

    describe('handleVerification', () => {
        it('debería retornar el challenge y actualizar estado a verificado para subscribe', async () => {
            const challenge = 'test-challenge';
            const result = await youtubePubSubService.handleVerification(channelId, 'subscribe', challenge);

            expect(result).toBe(challenge);
            expect(YouTubeSubscription.update).toHaveBeenCalledWith(
                { status: 'verified' },
                expect.objectContaining({ where: { channelId, status: 'pending' } })
            );
        });

        it('debería retornar el challenge y expirar para unsubscribe', async () => {
            const challenge = 'test-challenge';
            const result = await youtubePubSubService.handleVerification(channelId, 'unsubscribe', challenge);

            expect(result).toBe(challenge);
            expect(YouTubeSubscription.update).toHaveBeenCalledWith(
                { status: 'expired' },
                expect.objectContaining({ where: { channelId } })
            );
        });
    });

    describe('renewSubscription', () => {
        it('debería renovar una suscripción por expirar', async () => {
            const mockSub = {
                id: 'sub1',
                channelId: 'channel1',
                secret: encryptedSecret,
                topicUrl: 'topic',
                callbackUrl: 'callback',
                update: jest.fn()
            };
            (encryptionService.isEncrypted as jest.Mock).mockReturnValue(true);
            (encryptionService.decrypt as jest.Mock).mockReturnValue(secret);
            (axios.post as jest.Mock).mockResolvedValue({ status: 202 });

            await youtubePubSubService.renewSubscription(mockSub as unknown as YouTubeSubscription);

            expect(encryptionService.decrypt).toHaveBeenCalled();
            expect(mockSub.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'pending'
            }));
        });
    });
});
