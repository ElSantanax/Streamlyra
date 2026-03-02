import { YouTubeService } from '../YouTubeService';

jest.mock('../youtube/YouTubeProfileService');
jest.mock('../youtube/YouTubeLiveChatService');

describe('YouTubeService', () => {
    let service: YouTubeService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new YouTubeService();
    });

    describe('constructor', () => {
        it('debe crear instancia correctamente', () => {
            expect(service).toBeInstanceOf(YouTubeService);
        });
    });

    describe('métodos públicos', () => {
        it('debe tener método getActiveLiveChatId', () => {
            expect(typeof service.getActiveLiveChatId).toBe('function');
        });

        it('debe tener método sendChatMessage', () => {
            expect(typeof service.sendChatMessage).toBe('function');
        });
    });
});
