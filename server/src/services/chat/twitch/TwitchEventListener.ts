/** Escuchador de eventos de Twitch con gestión de listeners para prevenir memory leaks */

import tmi from 'tmi.js';
import { Server } from 'socket.io';
import { TwitchEventTransformer } from '../transformers/TwitchEventTransformer';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';

export class TwitchEventListener {
    private listenerRefs: Map<string, {
        message: (channel: string, tags: tmi.ChatUserstate, message: string, self: boolean) => void;
        subscription: (channel: string, username: string, method: tmi.SubMethods, message: string, tags: tmi.SubUserstate) => void;
        resub: (channel: string, username: string, months: number, message: string, tags: tmi.SubUserstate, methods: tmi.SubMethods) => void;
        cheer: (channel: string, userstate: tmi.ChatUserstate, message: string) => void;
    }> = new Map();

    constructor(private transformer: TwitchEventTransformer) {}

    setupListeners(userId: string, client: tmi.Client, io: Server): void {
        this.removeListeners(userId, client);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const messageListener = (_channel: string, tags: tmi.ChatUserstate, message: string, _self: boolean) => {
            const normalizedMessage = this.transformer.transformChatMessage(tags, message);
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'twitch');
        };

        const subscriptionListener = (_channel: string, username: string, _method: tmi.SubMethods, message: string, tags: tmi.SubUserstate) => {
            const normalizedMessage = this.transformer.transformSubscription(username, message, tags || {});
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'twitch');
        };

        const resubListener = (_channel: string, username: string, _months: number, message: string, tags: tmi.SubUserstate) => {
            const normalizedMessage = this.transformer.transformResub(username, message, tags || {});
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'twitch');
        };

        const cheerListener = (_channel: string, userstate: tmi.ChatUserstate, message: string) => {
            const normalizedMessage = this.transformer.transformCheer(userstate, message);
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'twitch');
        };

        this.listenerRefs.set(userId, {
            message: messageListener,
            subscription: subscriptionListener,
            resub: resubListener,
            cheer: cheerListener
        });

        client.on('message', messageListener);
        client.on('subscription', subscriptionListener);
        client.on('resub', resubListener);
        client.on('cheer', cheerListener);
    }

    removeListeners(userId: string, client: tmi.Client): void {
        const listeners = this.listenerRefs.get(userId);
        if (!listeners) return;

        client.removeListener('message', listeners.message);
        client.removeListener('subscription', listeners.subscription);
        client.removeListener('resub', listeners.resub);
        client.removeListener('cheer', listeners.cheer);

        this.listenerRefs.delete(userId);
    }
}
