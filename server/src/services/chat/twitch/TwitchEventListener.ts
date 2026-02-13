/** 
 * Escuchador de eventos de Twitch (IRC).
 * Solo mantiene activo el listener de mensajes de chat como respaldo.
 * Los eventos de alertas (subs, raids, etc) se manejan vía Webhooks (EventSub).
 */

import tmi from 'tmi.js';
import { Server } from 'socket.io';
import { TwitchEventTransformer } from '../transformers/TwitchEventTransformer';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';

export class TwitchEventListener {
    private listenerRefs: Map<string, {
        message: (channel: string, tags: tmi.ChatUserstate, message: string, self: boolean) => void;
    }> = new Map();

    constructor(private transformer: TwitchEventTransformer) { }

    setupListeners(userId: string, client: tmi.Client, io: Server): void {
        this.removeListeners(userId, client);

        const messageListener = (_channel: string, tags: tmi.ChatUserstate, message: string, _self: boolean) => {
            const normalizedMessage = this.transformer.transformChatMessage(tags, message);
            SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'twitch');
        };

        this.listenerRefs.set(userId, {
            message: messageListener
        });

        client.on('message', messageListener);
    }

    removeListeners(userId: string, client: tmi.Client): void {
        const listeners = this.listenerRefs.get(userId);
        if (!listeners) return;

        client.removeListener('message', listeners.message);
        this.listenerRefs.delete(userId);
    }
}
