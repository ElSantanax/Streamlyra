/**
 * Dashboard Page - Orquestador principal
 * Solo coordina hooks y componentes, sin lógica de negocio
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/dashboard/layout/DashboardHeader';
import ChatFeed from '../components/dashboard/chat/ChatFeed';

import { LocalErrorBoundary } from '../components/common/LocalErrorBoundary';
import { useAuth, useChatMessages, useSocket, useModeration } from '../hooks';
import { toast } from '../lib/notifications';

const Sidebar = lazy(() => import('../components/dashboard/layout/Sidebar'));

const ChatInput = lazy(() => import('../components/dashboard/chat/ChatInput/index'));
const AddPlatformModal = lazy(() => import('../components/dashboard/connections/AddPlatformModal'));

const Dashboard = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, connections, disconnectPlatform, refetchConnections, searchStream } = useAuth();
    const { messages, addMessage, updateMessageStatus, removeMessage, removeMessagesByUserId, clearMessages, messagesEndRef, containerRef, scrollToBottom, isAutoScrollEnabled } = useChatMessages();
    const { deleteMessage, banUser, replyToUser } = useModeration({
        onMessageDeleted: removeMessage,
        onUserBanned: removeMessagesByUserId
    });

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isAddPlatformOpen, setIsAddPlatformOpen] = useState(false);

    // Configurar el área de toasts dentro del contenedor de mensajes
    useEffect(() => {
        if (containerRef.current) {
            toast.setTargetElement(containerRef.current);
        }
        return () => {
            toast.setTargetElement(null);
        };
    }, [containerRef]);

    // Proteger ruta - usar useEffect para navegación
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    // Socket connection con callbacks para mensajes
    const { isConnected } = useSocket({
        userId: user?.id,
        onChatMessage: addMessage,
        onMessageStatusUpdate: updateMessageStatus,
        connections,
    });

    // No renderizar hasta que se verifique autenticación
    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="page-base h-screen overflow-hidden">
            <DashboardHeader
                onMenuClick={() => setIsSidebarOpen(true)}
                onAddPlatform={() => setIsAddPlatformOpen(true)}
                isConnected={isConnected}
            />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Overlays */}
                {isAddPlatformOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 lg:hidden"
                        onClick={() => setIsAddPlatformOpen(false)}
                    />
                )}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                <Suspense fallback={
                    <aside className="hidden lg:flex w-80 flex-col border-r border-surface-border bg-background-dark p-4 gap-6 overflow-y-auto">
                        <div className="h-4 w-24 bg-gray-700/50 rounded mb-6"></div>
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-16 bg-surface-dark rounded-lg border border-surface-border"></div>
                            ))}
                        </div>
                    </aside>
                }>
                    <LocalErrorBoundary section="Sidebar">
                        <div className={`
                            fixed inset-y-0 left-0 w-80 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:z-0
                            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                        `}>
                            <Sidebar
                                onMobileClose={() => setIsSidebarOpen(false)}
                                onAddPlatform={() => {
                                    setIsAddPlatformOpen(true);
                                    setIsSidebarOpen(false);
                                }}
                                connections={connections}
                                onDisconnect={disconnectPlatform}
                                onSearchStream={searchStream}
                                onClearChat={clearMessages}
                            />
                        </div>
                    </LocalErrorBoundary>
                </Suspense>

                <main className="flex-1 flex flex-col min-w-0 bg-background-dark relative">
                    {/* Messages Area */}
                    {/* Messages Area */}
                    <ChatFeed
                        messages={messages}
                        isConnected={isConnected}
                        containerRef={containerRef}
                        messagesEndRef={messagesEndRef}
                        scrollToBottom={scrollToBottom}
                        isAutoScrollEnabled={isAutoScrollEnabled}
                        onReply={replyToUser}
                        onDelete={deleteMessage}
                        onBan={banUser}
                    />

                    <LocalErrorBoundary section="Chat Input">
                        <Suspense fallback={<div className="h-24 bg-background-dark border-t border-surface-border"></div>}>
                            <ChatInput />
                        </Suspense>
                    </LocalErrorBoundary>
                </main>
            </div>

            {isAddPlatformOpen && (
                <LocalErrorBoundary section="Add Platform Modal">
                    <Suspense fallback={null}>
                        <AddPlatformModal
                            isOpen={isAddPlatformOpen}
                            onClose={() => setIsAddPlatformOpen(false)}
                            connections={connections}
                            onConnectionSuccess={refetchConnections}
                        />
                    </Suspense>
                </LocalErrorBoundary>
            )}
        </div>
    );
};

export default Dashboard;
