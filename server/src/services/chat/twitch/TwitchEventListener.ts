/**
 * Escuchador de Eventos de Twitch
 * Responsabilidad: Configurar listeners de eventos de Twitch
 */

import tmi from 'tmi.js';
import { Server } from 'socket.io';
import { TwitchEventTransformer } from '../transformers/TwitchEventTransformer';

export class TwitchEventListener {
    constructor(private transformer: TwitchEventTransformer) {}

    setupListeners(userId: string, client: tmi.Client, io: Server): void {
        client.on('message', (_channel, tags, message, _self) => {
            const normalizedMessage = this.transformer.transformChatMessage(tags, message);
            io.to(userId).emit('chat_message', normalizedMessage);
        });

        client.on('subscription', (_channel, username, _method, message, tags) => {
            const normalizedMessage = this.transformer.transformSubscription(username, message, tags || {});
            io.to(userId).emit('chat_message', normalizedMessage);
        });

        client.on('resub', (_channel, username, _months, message, tags) => {
            const normalizedMessage = this.transformer.transformResub(username, message, tags || {});
            io.to(userId).emit('chat_message', normalizedMessage);
        });

        client.on('cheer', (_channel, userstate, message) => {
            const normalizedMessage = this.transformer.transformCheer(userstate, message);
            io.to(userId).emit('chat_message', normalizedMessage);
        });
    }
}
