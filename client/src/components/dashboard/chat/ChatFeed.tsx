import { Suspense, memo, useRef, useMemo, useState, useCallback } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import Spinner from '../../common/Spinner';
import { LocalErrorBoundary } from '../../common/LocalErrorBoundary';
import ChatMessage from './ChatMessage';
import type { ChatMessage as ChatMessageData } from '../../../types/chat.types';
import type { PlatformKey } from '../../../constants/platforms';

interface ChatFeedProps {
    messages: ChatMessageData[];
    isConnected: boolean;
    onReply: (username: string) => void;
    onDelete: (messageId: string, platform: PlatformKey, platformIds?: Record<string, string>) => void;
    onBan: (userId: string, username: string, platform: PlatformKey) => void;
}

const ChatFeed = memo(({
    messages,
    isConnected,
    onReply,
    onDelete,
    onBan
}: ChatFeedProps) => {
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    const scrollToBottom = useCallback(() => {
        if (virtuosoRef.current) {
            virtuosoRef.current.scrollToIndex({
                index: messages.length - 1,
                behavior: 'smooth'
            });
        }
    }, [messages.length]);

    // Handlers estables para evitar re-renderizados de los items
    const handleDelete = useCallback((messageId: string, platform: PlatformKey, platformIds?: Record<string, string>) => {
        onDelete(messageId, platform, platformIds);
    }, [onDelete]);

    const handleBan = useCallback((userId: string, username: string, platform: PlatformKey) => {
        onBan(userId, username, platform);
    }, [onBan]);

    // Renderizado de cada mensaje individual dentro de la lista virtualizada
    const itemContent = useCallback((_index: number, msg: ChatMessageData) => (
        <div className="pb-2 px-4 md:px-2">
            <ChatMessage
                key={msg.id}
                {...msg}
                onReply={onReply}
                onDelete={(messageId) => handleDelete(messageId, msg.platform, msg.platformIds)}
                onBan={(userId, username) => handleBan(userId, username, msg.platform)}
            />
        </div>
    ), [onReply, handleDelete, handleBan]);

    const emptyState = useMemo(() => (
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 select-none h-full">
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
    ), [isConnected]);

    return (
        <LocalErrorBoundary section="Chat Feed">
            <div className="flex-1 min-h-0 relative group">
                <Suspense fallback={
                    <div className="flex-1 flex items-center justify-center h-full">
                        <Spinner size="md" />
                    </div>
                }>
                    {messages.length > 0 ? (
                        <Virtuoso
                            ref={virtuosoRef}
                            data={messages}
                            itemContent={itemContent}
                            followOutput="auto"
                            initialTopMostItemIndex={messages.length - 1}
                            className="absolute inset-0 custom-scrollbar"
                            atBottomStateChange={setIsAtBottom}
                            atBottomThreshold={60}
                            style={{ height: '100%', width: '100%' }}
                        />
                    ) : emptyState}
                </Suspense>

                {!isAtBottom && messages.length > 0 && (
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
