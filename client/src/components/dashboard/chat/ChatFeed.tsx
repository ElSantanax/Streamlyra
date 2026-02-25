import { memo, useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { useTranslation } from 'react-i18next';
import { LocalErrorBoundary } from '../../common/LocalErrorBoundary';
import { MdArrowDownward } from 'react-icons/md';
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
    const { t } = useTranslation();
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [prevMessagesLength, setPrevMessagesLength] = useState(messages.length);

    const scrollToBottom = useCallback(() => {
        if (virtuosoRef.current) {
            virtuosoRef.current.scrollToIndex({
                index: 'LAST',
                behavior: 'smooth'
            });
            setUnreadCount(0);
        }
    }, []);

    const onReplyRef = useRef(onReply);
    const onDeleteRef = useRef(onDelete);
    const onBanRef = useRef(onBan);

    if (isAtBottom && unreadCount > 0) {
        setUnreadCount(0);
    }

    if (!isAtBottom) {
        if (messages.length > prevMessagesLength) {
            setUnreadCount(prev => prev + (messages.length - prevMessagesLength));
            setPrevMessagesLength(messages.length);
        } else if (messages.length < prevMessagesLength) {
            setPrevMessagesLength(messages.length);
        }
    } else if (messages.length !== prevMessagesLength) {
        setPrevMessagesLength(messages.length);
    }

    useEffect(() => {
        onReplyRef.current = onReply;
        onDeleteRef.current = onDelete;
        onBanRef.current = onBan;
    }, [onReply, onDelete, onBan]);

    const handleReplyStable = useCallback((username: string) => {
        onReplyRef.current?.(username);
    }, []);

    const handleDeleteStable = useCallback((messageId: string, platform: PlatformKey, platformIds?: Record<string, string>) => {
        onDeleteRef.current?.(messageId, platform, platformIds);
    }, []);

    const handleBanStable = useCallback((userId: string, username: string, platform: PlatformKey) => {
        onBanRef.current?.(userId, username, platform);
    }, []);

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
                {isConnected ? t('dashboard.chat.empty.readyTitle') : t('dashboard.chat.empty.connectTitle')}
            </h3>
            <p className="text-gray-400 max-w-xs mx-auto text-sm leading-relaxed">
                {isConnected
                    ? t('dashboard.chat.empty.readyDesc')
                    : t('dashboard.chat.empty.connectDesc')}
            </p>
        </div>
    ), [isConnected, t]);

    return (
        <LocalErrorBoundary section="Chat Feed">
            <div className="flex-1 min-h-0 relative group">
                {messages.length > 0 ? (
                    <Virtuoso
                        ref={virtuosoRef}
                        data={messages}
                        itemContent={itemContent}
                        computeItemKey={(_index, msg) => msg.id ? `${msg.id}-${msg.platform}` : `msg-${Math.random()}`}
                        alignToBottom={true}
                        followOutput="auto"
                        className="absolute inset-0 custom-scrollbar"
                        atBottomStateChange={(bottom) => {
                            setIsAtBottom(bottom);
                        }}
                        initialTopMostItemIndex={messages.length - 1}
                        atBottomThreshold={150}
                        increaseViewportBy={1000}
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
                            title={t('dashboard.chat.scrollDown')}
                        >
                            {unreadCount > 0 && (
                                <span className="text-primary font-bold text-xs">
                                    {unreadCount === 1 ? t('dashboard.chat.newMessages_one') : t('dashboard.chat.newMessages_other', { count: unreadCount })}
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