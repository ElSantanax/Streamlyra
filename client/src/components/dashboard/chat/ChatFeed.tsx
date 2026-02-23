import { memo, useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { LocalErrorBoundary } from '../../common/LocalErrorBoundary';
import { MdArrowDownward } from 'react-icons/md';
import ChatMessage from './ChatMessage';
import type { ChatMessage as ChatMessageData } from '../../../types/chat.types';
import type { PlatformKey } from '../../../constants/platforms';

interface ChatFeedProps {
    messages: ChatMessageData[];
    firstItemIndex: number;
    isConnected: boolean;
    onReply: (username: string) => void;
    onDelete: (messageId: string, platform: PlatformKey, platformIds?: Record<string, string>) => void;
    onBan: (userId: string, username: string, platform: PlatformKey) => void;
}

const ChatFeed = memo(({
    messages,
    firstItemIndex,
    isConnected,
    onReply,
    onDelete,
    onBan
}: ChatFeedProps) => {
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const prevMessagesLengthRef = useRef(messages.length);

    const scrollToBottom = useCallback(() => {
        if (virtuosoRef.current) {
            virtuosoRef.current.scrollToIndex({
                index: messages.length - 1 + firstItemIndex,
                behavior: 'smooth'
            });
            setUnreadCount(0);
        }
    }, [messages.length, firstItemIndex]);

    // Refs para mantener los handlers actualizados sin romper la memoización de los items
    const onReplyRef = useRef(onReply);
    const onDeleteRef = useRef(onDelete);
    const onBanRef = useRef(onBan);

    useEffect(() => {
        if (isAtBottom) {
            setUnreadCount(0);
        } else {
            const added = messages.length - prevMessagesLengthRef.current;
            if (added > 0) {
                setUnreadCount((prev) => prev + added);
            }
        }
        prevMessagesLengthRef.current = messages.length;
    }, [messages.length, isAtBottom]);

    useEffect(() => {
        onReplyRef.current = onReply;
        onDeleteRef.current = onDelete;
        onBanRef.current = onBan;
    }, [onReply, onDelete, onBan]);

    // Handlers estables que nunca cambian de referencia
    const handleReplyStable = useCallback((username: string) => {
        onReplyRef.current?.(username);
    }, []);

    const handleDeleteStable = useCallback((messageId: string, platform: PlatformKey, platformIds?: Record<string, string>) => {
        onDeleteRef.current?.(messageId, platform, platformIds);
    }, []);

    const handleBanStable = useCallback((userId: string, username: string, platform: PlatformKey) => {
        onBanRef.current?.(userId, username, platform);
    }, []);

    // Renderizado de cada mensaje individual dentro de la lista virtualizada
    // Al usar handlers estables, itemContent no cambia NUNCA, optimizando Virtuoso al máximo
    const itemContent = useCallback((_index: number, msg: ChatMessageData) => (
        <div className="pb-2 px-4 md:px-2">
            <ChatMessage
                {...msg}
                onReply={handleReplyStable}
                onDelete={handleDeleteStable}
                onBan={handleBanStable}
            />
        </div>
    ), [handleReplyStable, handleDeleteStable, handleBanStable]);

    const emptyState = useMemo(() => (
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 select-none h-full">
            <div className="bg-surface-dark p-6 rounded-full mb-4 ring-4 ring-surface-border animate-pulse">
                <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
                {isConnected ? "¡Todo listo para empezar!" : "Conecta tus plataformas"}
            </h3>
            <p className="text-gray-400 max-w-xs mx-auto text-sm leading-relaxed">
                {isConnected
                    ? "Aún no hay mensajes por aquí. ¡Anima a tu comunidad a romper el hielo!"
                    : "Vincula tus cuentas para empezar a recibir los mensajes de tu comunidad aquí mismo."}
            </p>
        </div>
    ), [isConnected]);

    return (
        <LocalErrorBoundary section="Chat Feed">
            <div className="flex-1 min-h-0 relative group">
                {messages.length > 0 ? (
                    <Virtuoso
                        ref={virtuosoRef}
                        data={messages}
                        itemContent={itemContent}
                        firstItemIndex={firstItemIndex}
                        computeItemKey={(_index, msg) => msg.id ? `${msg.id}-${msg.platform}` : `msg-${_index}`}
                        alignToBottom={true}
                        followOutput={(isAtBottom) => isAtBottom ? 'smooth' : false}
                        className="absolute inset-0 custom-scrollbar"
                        atBottomStateChange={setIsAtBottom}
                        atBottomThreshold={100}
                        increaseViewportBy={500}
                        style={{ height: '100%', width: '100%', overflowAnchor: 'none' }}
                    />
                ) : emptyState}

                {!isAtBottom && messages.length > 0 && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20 pointer-events-none">
                        <button
                            onClick={scrollToBottom}
                            className={`bg-surface-dark/95 backdrop-blur-sm border border-primary/30 text-white shadow-2xl shadow-black/50 flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 pointer-events-auto animate-in slide-in-from-bottom-2 fade-in hover:bg-surface-light group-hover:opacity-100 ${unreadCount > 0
                                ? 'px-4 py-2 rounded-full gap-2'
                                : 'w-10 h-10 rounded-full'
                                }`}
                            title="Volver abajo"
                        >
                            {unreadCount > 0 && (
                                <span className="text-primary font-bold text-xs">
                                    {unreadCount === 1 ? '1 mensaje nuevo' : `${unreadCount} mensajes nuevos`}
                                </span>
                            )}
                            <MdArrowDownward size={16} className="text-primary" />
                        </button>
                    </div>
                )}
            </div>
        </LocalErrorBoundary>
    );
});

ChatFeed.displayName = 'ChatFeed';

export default ChatFeed;
