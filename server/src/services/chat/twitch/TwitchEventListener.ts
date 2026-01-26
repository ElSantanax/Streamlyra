/**
 * Escuchador de Eventos de Twitch
 * Responsabilidad: Configurar listeners de eventos de Twitch
 */

import tmi from 'tmi.js';
import { Server } from 'socket.io';
import { TwitchEventTransformer } from '../transformers/TwitchEventTransformer';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';

export class TwitchEventListener {
    // Almacenar referencias a listeners para poder removerlos
    // Esto previene memory leaks cuando un usuario se reconecta
    private listenerRefs: Map<string, {
        message: (channel: string, tags: tmi.ChatUserstate, message: string, self: boolean) => void;
        subscription: (channel: string, username: string, method: tmi.SubMethods, message: string, tags: tmi.SubUserstate) => void;
        resub: (channel: string, username: string, months: number, message: string, tags: tmi.SubUserstate, methods: tmi.SubMethods) => void;
        cheer: (channel: string, userstate: tmi.ChatUserstate, message: string) => void;
    }> = new Map();

    constructor(private transformer: TwitchEventTransformer) {}

    setupListeners(userId: string, client: tmi.Client, io: Server): void {
        // Remover listeners anteriores si existen (prevenir duplicados)
        this.removeListeners(userId, client);

        // Crear funciones de listener con referencias para poder removerlas después
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

        // Almacenar referencias para poder removerlas después
        this.listenerRefs.set(userId, {
            message: messageListener,
            subscription: subscriptionListener,
            resub: resubListener,
            cheer: cheerListener
        });

        // Agregar listeners al cliente
        client.on('message', messageListener);
        client.on('subscription', subscriptionListener);
        client.on('resub', resubListener);
        client.on('cheer', cheerListener);
    }

    /**
     * Remueve todos los listeners de un usuario
     * Esto previene memory leaks y mensajes duplicados
     */
    removeListeners(userId: string, client: tmi.Client): void {
        const listeners = this.listenerRefs.get(userId);
        if (!listeners) return;

        // Remover cada listener del cliente (tmi.js usa removeListener)
        client.removeListener('message', listeners.message);
        client.removeListener('subscription', listeners.subscription);
        client.removeListener('resub', listeners.resub);
        client.removeListener('cheer', listeners.cheer);

        // Limpiar referencias
        this.listenerRefs.delete(userId);
    }
}
