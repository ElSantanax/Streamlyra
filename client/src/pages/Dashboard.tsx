/**
 * Dashboard Page - Orquestador principal
 * Solo coordina hooks y componentes, sin lógica de negocio
 */

import { useState, useEffect, useRef, Suspense, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/dashboard/layout/DashboardHeader';

import { LocalErrorBoundary } from '../components/common/LocalErrorBoundary';
import { useAuth, useChatMessages, useSocket, useModeration } from '../hooks';
import { toast } from '../lib/notifications';
import { useConnectionsStatus } from '../hooks/useConnectionsContext';
import type { PlatformKey } from '../constants/platforms';

import Sidebar from '../components/dashboard/layout/Sidebar';
import ChatInput from '../components/dashboard/chat/ChatInput/index';
import AddPlatformModal from '../components/dashboard/connections/AddPlatformModal';
import ChatFeed from '../components/dashboard/chat/ChatFeed';

const DashboardContent = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();

    // Usamos el contexto optimizado de STATUS para el layout principal
    const {
        connectionsStatus,
        connectionHash,
        disconnectPlatform,
        searchStream,
        refetchConnections
    } = useConnectionsStatus();

    const {
        messages,
        addMessage,
        updateMessageStatus,
        removeMessage,
        removeMessagesByUserId,
        clearMessages
    } = useChatMessages();
    const chatAreaRef = useRef<HTMLElement>(null);

    // Memorizar opciones de moderación de forma persistente
    const moderationOptions = useMemo(() => ({
        onMessageDeleted: removeMessage,
        onUserBanned: removeMessagesByUserId
    }), [removeMessage, removeMessagesByUserId]);

    const { deleteMessage, banUser, replyToUser } = useModeration(moderationOptions);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isAddPlatformOpen, setIsAddPlatformOpen] = useState(false);

    const toggleSidebar = useCallback((open: boolean) => {
        setIsSidebarOpen(open);
    }, []);

    const toggleAddPlatform = useCallback((open: boolean) => {
        setIsAddPlatformOpen(open);
    }, []);

    const handleAddPlatformFromSidebar = useCallback(() => {
        setIsAddPlatformOpen(true);
        setIsSidebarOpen(false);
    }, []);

    useEffect(() => {
        if (chatAreaRef.current) {
            toast.setTargetElement(chatAreaRef.current);
        }
        refetchConnections(false);

        return () => {
            toast.setTargetElement(null);
        };
    }, [refetchConnections]);

    // Proteger ruta - usar useEffect para navegación
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    // Envolver desconexión para limpiar mensajes localmente también
    const handleDisconnectPlatform = useCallback(async (platform: PlatformKey) => {
        try {
            await disconnectPlatform(platform);
        } catch (error) {
            console.error('Error disconnecting platform:', error);
        }
    }, [disconnectPlatform]);

    // Socket connection con callbacks para mensajes
    const { isConnected } = useSocket({
        userId: user?.id,
        onChatMessage: addMessage,
        onMessageStatusUpdate: updateMessageStatus,
        connections: connectionsStatus, // useSocket solo usa .connected

        connectionHash,
    });

    const handleOpenSidebar = useCallback(() => toggleSidebar(true), [toggleSidebar]);
    const handleCloseSidebar = useCallback(() => toggleSidebar(false), [toggleSidebar]);
    const handleOpenAddPlatform = useCallback(() => toggleAddPlatform(true), [toggleAddPlatform]);
    const handleCloseAddPlatform = useCallback(() => toggleAddPlatform(false), [toggleAddPlatform]);

    const handleConnectionSuccess = useCallback(() => {
        refetchConnections(true);
    }, [refetchConnections]);

    // No renderizar hasta que se verifique autenticación
    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="page-base h-screen overflow-hidden">
            <DashboardHeader
                onMenuClick={handleOpenSidebar}
                onAddPlatform={handleOpenAddPlatform}
                isConnected={isConnected}
            />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Overlays */}
                {isAddPlatformOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 lg:hidden"
                        onClick={handleCloseAddPlatform}
                    />
                )}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 lg:hidden"
                        onClick={handleCloseSidebar}
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
                                onMobileClose={handleCloseSidebar}
                                onAddPlatform={handleAddPlatformFromSidebar}
                                onDisconnect={handleDisconnectPlatform}
                                onSearchStream={searchStream}
                                onClearChat={clearMessages}
                            />
                        </div>
                    </LocalErrorBoundary>
                </Suspense>

                <main
                    ref={chatAreaRef}
                    className="flex-1 flex flex-col min-w-0 bg-background-dark relative"
                >
                    {/* Messages Area */}
                    <Suspense fallback={
                        <div className="flex-1 flex items-center justify-center bg-background-dark">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                    }>
                        <ChatFeed
                            messages={messages}
                            isConnected={isConnected}
                            onReply={replyToUser}
                            onDelete={deleteMessage}
                            onBan={banUser}
                        />
                    </Suspense>

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
                            onClose={handleCloseAddPlatform}
                            onConnectionSuccess={handleConnectionSuccess}
                        />
                    </Suspense>
                </LocalErrorBoundary>
            )}
        </div>
    );
};

const Dashboard = () => {
    return <DashboardContent />;
};

export default Dashboard;
