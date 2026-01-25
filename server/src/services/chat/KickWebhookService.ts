import * as crypto from 'crypto';
import axios from 'axios';
import { Server } from 'socket.io';
import { Connection } from '../../models/Connection.model';
import { KickApiResponse, KickChatMessagePayload } from '../../types/kick.types';

export class KickWebhookService {
    private static publicKey: string | null = null;
    private static lastKeyFetch: number = 0;

    // Obtener la clave pública de Kick (se cachea por 1 hora)
    private static async getPublicKey(): Promise<string | null> {
        const now = Date.now();
        if (this.publicKey && (now - this.lastKeyFetch < 3600000)) {
            return this.publicKey;
        }

        try {
            const response = await axios.get<KickApiResponse<{ public_key: string }>>('https://api.kick.com/public/v1/public-key');
            this.publicKey = response.data.data.public_key;
            this.lastKeyFetch = now;
            return this.publicKey;
        } catch (error) {
            console.error('[KickWebhook] Error obteniendo clave pública:', error);
            return null;
        }
    }

    // Verificar la firma del webhook
    static async verifySignature(
        signature: string,
        messageId: string,
        timestamp: string,
        rawBody: string
    ): Promise<boolean> {
        const key = await this.getPublicKey();
        if (!key) return false;
        if (!messageId || !timestamp || !rawBody) return false;

        try {
            // Docs oficiales:
            // signature_payload := "{Kick-Event-Message-Id}.{Kick-Event-Message-Timestamp}.{rawBody}"
            const signaturePayload = `${messageId}.${timestamp}.${rawBody}`;

            const verifier = crypto.createVerify('RSA-SHA256');
            verifier.update(signaturePayload);
            verifier.end();

            return verifier.verify(
                {
                    key: key,
                    padding: crypto.constants.RSA_PKCS1_PADDING
                },
                Buffer.from(signature, 'base64')
            );
        } catch (error) {
            console.error('[KickWebhook] Error verificando firma:', error);
            return false;
        }
    }

    // Procesar el evento de chat
    static async handleChatEvent(payload: KickChatMessagePayload, io: Server) {
        const { broadcaster, sender, content, message_id, created_at } = payload;
        const msgId = message_id || payload.id;

        const chatMessage = {
            id: msgId,
            platform: 'kick',
            user: sender.username,
            message: content,
            time: new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            color: sender.identity?.username_color || '#53FC18',
            isMod: sender.identity?.badges?.some((b) => b.type === 'moderator'),
            isSub: sender.identity?.badges?.some((b) => b.type === 'subscriber'),
            isVIP: false,
            isOwner: broadcaster.user_id === sender.user_id
        };

        // Kick envía el broadcaster.user_id (ID de Kick), pero nuestro socket usa userId (UUID app).
        // Mapeamos broadcasterKickId -> Connection.userId.
        try {
            const broadcasterKickId = broadcaster?.user_id;
            if (!broadcasterKickId) {
                console.warn('[KickWebhook] Payload sin broadcaster.user_id');
                return;
            }

            const connection = await Connection.findOne({
                where: { provider: 'kick', providerId: broadcasterKickId.toString() }
            });

            if (!connection) {
                console.warn(`[KickWebhook] No hay Connection para broadcasterKickId=${broadcasterKickId}`);
                return;
            }

            io.to(connection.userId).emit('chat_message', chatMessage);
        } catch (error) {
            console.error('[KickWebhook] Error emitiendo al socket:', error);
        }
    }
}
