
import { Suspense, memo } from 'react';
import Spinner from '../../common/Spinner';
import { LocalErrorBoundary } from '../../common/LocalErrorBoundary';
import ChatMessage from './ChatMessage';
import type { ChatMessage as ChatMessageData } from '../../../types/chat.types';
import type { PlatformKey } from '../../../constants/platforms';

interface ChatFeedProps {
    messages: ChatMessageData[];
    isConnected: boolean;
    containerRef: React.RefObject<HTMLDivElement | null>;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    scrollToBottom: () => void;
    isAutoScrollEnabled: boolean;
    onReply: (username: string) => void;
    onDelete: (messageId: string, platform: PlatformKey, platformIds?: Record<string, string>) => void;
    onBan: (userId: string, username: string, platform: PlatformKey) => void;
}

const ChatFeed = memo(({
    messages,
    isConnected,
    containerRef,
    messagesEndRef,
    scrollToBottom,
    isAutoScrollEnabled,
    onReply,
    onDelete,
    onBan
}: ChatFeedProps) => {
    return (
        <LocalErrorBoundary section="Chat Feed">
            <div className="flex-1 min-h-0 relative group">
                <div ref={containerRef} className="absolute inset-0 overflow-y-auto p-4 md:px-2 md:py-2 custom-scrollbar">
                    <div className="flex flex-col gap-2 min-h-full">
                        <Suspense fallback={
                            <div className="flex-1 flex items-center justify-center">
                                <Spinner size="md" />
                            </div>
                        }>
                            {messages.length > 0 ? (
                                <div className="flex flex-col gap-y-2">
                                    {messages.map((msg) => (
                                        <ChatMessage
                                            key={msg.id}
                                            {...msg}
                                            onReply={onReply}
                                            onDelete={(messageId) => onDelete(messageId, msg.platform, msg.platformIds)}
                                            onBan={(userId, username) => onBan(userId, username, msg.platform)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 select-none pb-20">
                                    <div className="bg-surface-dark p-6 rounded-full mb-4 ring-4 ring-surface-border animate-pulse">
                                        <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Conectado al servidor</h3>
                                    <p className="text-gray-400 max-w-xs mx-auto">
                                        {isConnected
                                            ? "Esperando mensajes..."
                                            : "Conectando..."}
                                    </p>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </Suspense>
                    </div>
                </div>

                {!isAutoScrollEnabled && messages.length > 0 && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20 pointer-events-none">
                        <button
                            onClick={scrollToBottom}
                            className="bg-surface-dark/95 backdrop-blur-sm border border-primary/30 text-white px-4 py-2 rounded-full shadow-2xl shadow-black/50 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 pointer-events-auto animate-in slide-in-from-bottom-2 fade-in hover:bg-surface-light group-hover:opacity-100"
                        >
                            <span className="text-primary font-bold">Ver mensajes nuevos</span>
                            <span className="material-symbols-outlined text-[16px] text-primary">arrow_downward</span>
                        </button>
                    </div>
                )}
            </div>
        </LocalErrorBoundary>
    );
});

ChatFeed.displayName = 'ChatFeed';

export default ChatFeed;
