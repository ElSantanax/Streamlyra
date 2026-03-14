import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { PLATFORMS } from '../constants/platforms';
import { UserBadge } from '../components/common/UserBadge';
import { MessageContent } from '../components/dashboard/chat/ChatMessage/components/MessageContent';
import type { ChatMessage } from '../types';

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string | undefined) || 'http://localhost:4000';
const MESSAGE_HIDE_TIMEOUT = 25000; // 25 segundos antes de desaparecer

const OverlayChat = () => {
    const { token } = useParams<{ token: string }>();
    const [messages, setMessages] = useState<(ChatMessage & { visible: boolean })[]>([]);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!token) return;

        // Conectar usando el Overlay Token
        const socket = io(SOCKET_URL, {
            transports: ['websocket'],
            auth: { overlayToken: token }
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Overlay conectado al servidor');
        });

        socket.on('chat_message', (msg: ChatMessage | ChatMessage[]) => {
            const rawNewMessages = Array.isArray(msg) ? msg : [msg];

            // Garantizar que todos tengan un ID único
            const newMessages = rawNewMessages.map(m => ({
                ...m,
                id: m.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
            }));

            setMessages(prev => {
                const uniqueNewMessages = newMessages.filter((newMsg, index, self) => {
                    // Evitar repetir mensajes del streamer (isOwner) en pantalla
                    if (newMsg.isOwner) {
                        // 1. Verificar si ya existe en los mensajes previos y aún está visible
                        const existsInPrev = prev.some(prevMsg => 
                            prevMsg.isOwner && 
                            prevMsg.visible && 
                            prevMsg.message.trim() === newMsg.message.trim()
                        );
                        if (existsInPrev) return false;

                        // 2. Verificar si viene duplicado en este mismo lote
                        const existsInSelf = self.findIndex(m => m.isOwner && m.message.trim() === newMsg.message.trim()) < index;
                        if (existsInSelf) return false;
                    }

                    // Deduplicación general por ID y plataforma
                    const existsById = prev.some(prevMsg => 
                        prevMsg.id === newMsg.id && prevMsg.platform === newMsg.platform
                    );
                    if (existsById) return false;

                    return true;
                });

                if (uniqueNewMessages.length === 0) return prev;

                const nextMessages = [...prev, ...uniqueNewMessages.map(m => ({ ...m, visible: true }))];
                // Mantener solo los últimos 50 mensajes para rendimiento
                if (nextMessages.length > 50) {
                    return nextMessages.slice(nextMessages.length - 50);
                }
                return nextMessages;
            });

            // Programar desaparición
            newMessages.forEach(m => {
                setTimeout(() => {
                    setMessages(current =>
                        current.map(msg => msg.id === m.id ? { ...msg, visible: false } : msg)
                    );
                }, MESSAGE_HIDE_TIMEOUT);
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [token]);

    return (
        <div className="fixed inset-0 bg-transparent flex flex-col justify-end p-6 overflow-hidden select-none">
            <div className="flex flex-col gap-3 max-w-125">
                {messages.map((msg, index) => {
                    if (!msg.visible) return null;

                    const { Icon, textColor, brandColor } = PLATFORMS[msg.platform] || PLATFORMS.system;
                    const isYouTube = msg.platform === 'youtube';

                    return (
                        <div
                            key={`${msg.id || index}-${msg.platform}`}
                            className="flex flex-col gap-1 p-3 rounded-lg bg-black/60 border-l-4 backdrop-blur-sm animate-in fade-in slide-in-from-left duration-500"
                            style={{ borderLeftColor: brandColor }}
                        >
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <span
                                        className={`font-bold text-lg ${!msg.color ? textColor : ''}`}
                                        style={msg.color ? { color: msg.color } : undefined}
                                    >
                                        {msg.user}
                                    </span>

                                    <Icon size={16} style={{ color: brandColor }} />

                                    {msg.isOwner && <UserBadge type="streamer" isYouTube={isYouTube} />}
                                    {msg.isMod && <UserBadge type="mod" isYouTube={isYouTube} />}
                                    {msg.isVIP && <UserBadge type="vip" isYouTube={isYouTube} />}
                                    {msg.isSub && <UserBadge type="sub" isYouTube={isYouTube} />}
                                </div>
                            </div>

                            <div className="text-white text-base leading-relaxed wrap-break-word drop-shadow-md">
                                <MessageContent
                                    message={msg.message}
                                    platform={msg.platform}
                                    textColor="text-white"
                                    emotes={msg.emotes}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OverlayChat;
