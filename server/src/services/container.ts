import { Server } from 'socket.io';
import { UserRepository } from '../repositories/implementations/UserRepository';
import { ConnectionRepository } from '../repositories/implementations/ConnectionRepository';
import { ConnectionService } from './connection/ConnectionService';
import { TwitchService, YouTubeService, KickService } from './platforms';
import { MessageSenderService } from './message/MessageSenderService';
import { ChatManager } from './core/ChatManager';
import { TwitchChatProvider, YouTubeChatProvider, KickChatProvider, TikTokChatProvider, ChatProvider } from './chat';
import { UserService } from './user/UserService';
import { AuthDTOBuilder } from './auth/AuthDTOBuilder';
import { PlatformAuthHandler } from './auth/core/PlatformAuthHandler';
import { AuthFlowProcessor } from './auth/AuthFlowProcessor';
import { UserProfileService } from './auth/core/UserProfileService';
import { AuthService } from './auth/AuthService';
import { WebhookProcessor } from './webhook/WebhookProcessor';
import { AuthController } from '../controllers/auth.controller';
import { WebhookController } from '../controllers/webhook.controller';
import { Platform } from '../constants/platforms';

/**
 * Contenedor de dependencias para centralizar la instanciación de servicios y controladores.
 */
export function createContainer(io: Server) {
    // Repositories
    const userRepository = new UserRepository();
    const connectionRepository = new ConnectionRepository();

    // Base Services
    const connectionService = new ConnectionService(connectionRepository);
    const twitchService = new TwitchService();
    const youtubeService = new YouTubeService();
    const kickService = new KickService();

    const messageSenderService = new MessageSenderService(
        connectionService,
        twitchService,
        youtubeService,
        kickService
    );

    // Chat Management
    const twitchChatProvider = new TwitchChatProvider(connectionService);
    const youtubeChatProvider = new YouTubeChatProvider(connectionService);
    const kickChatProvider = new KickChatProvider(connectionService);
    const tiktokChatProvider = new TikTokChatProvider();

    const chatManager = new ChatManager(io, connectionService);
    chatManager.setProviders(new Map<Platform, ChatProvider>([
        ['twitch', twitchChatProvider],
        ['youtube', youtubeChatProvider],
        ['kick', kickChatProvider],
        ['tiktok', tiktokChatProvider]
    ]));

    // Auth & User Services
    const userServiceInst = new UserService(userRepository, connectionRepository);
    const authDTOBuilder = new AuthDTOBuilder();
    const platformAuthHandler = new PlatformAuthHandler(
        userServiceInst,
        connectionRepository,
        authDTOBuilder
    );
    const authFlowProcessor = new AuthFlowProcessor(
        platformAuthHandler,
        chatManager,
        connectionService
    );
    const userProfileService = new UserProfileService(
        userServiceInst,
        authDTOBuilder
    );

    const authService = new AuthService(authFlowProcessor, userProfileService);
    const webhookProcessor = new WebhookProcessor(io, connectionService);

    // Controllers
    const authController = new AuthController(authService);
    const webhookController = new WebhookController(webhookProcessor);

    return {
        chatManager,
        messageSenderService,
        connectionService,
        youtubeService,
        authController,
        webhookController
    };
}
