/**
 * Dashboard Page - Orquestador principal
 * Solo coordina hooks y componentes, sin lógica de negocio
 */

import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import Spinner from '../components/common/Spinner';
import { LocalErrorBoundary } from '../components/common/LocalErrorBoundary';
import { useAuth, useConnections, useChatMessages, useSocket } from '../hooks';
import { toast } from '../lib/notifications';

const Sidebar = lazy(() => import('../components/dashboard/Sidebar'));
const ChatMessage = lazy(() => import('../components/dashboard/ChatMessage'));
const ChatInput = lazy(() => import('../components/dashboard/ChatInput/index'));
const AddPlatformModal = lazy(() => import('../components/dashboard/AddPlatformModal'));

const Dashboard = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const { connections, updateConnection, disconnectPlatform, refetch } = useConnections(isAuthenticated);
    const { messages, addMessage, updateMessageStatus, messagesEndRef } = useChatMessages();
    const messagesAreaRef = useRef<HTMLDivElement>(null);
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isAddPlatformOpen, setIsAddPlatformOpen] = useState(false);

    // Configurar el área de toasts dentro del contenedor de mensajes
    useEffect(() => {
        if (messagesAreaRef.current) {
            toast.setTargetElement(messagesAreaRef.current);
        }
        return () => {
            toast.setTargetElement(null);
        };
    }, []);

    // Proteger ruta - usar useEffect para navegación
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    // Socket connection con callbacks
    const { isConnected } = useSocket({
        userId: user?.id,
        onChatMessage: addMessage,
        onMessageStatusUpdate: updateMessageStatus,
        onViewersUpdate: (data) => {
            updateConnection(data.platform, { viewers: data.count });
        },
        onConnectionStatus: (data) => {
            updateConnection(data.platform, {
                status: data.status,
                statusMessage: data.message,
                connected: data.status === 'connected',
            });
        },
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
                            />
                        </div>
                    </LocalErrorBoundary>
                </Suspense>

                <main className="flex-1 flex flex-col min-w-0 bg-background-dark relative">
                    {/* Messages Area */}
                    <LocalErrorBoundary section="Chat Feed">
                        <div ref={messagesAreaRef} className="flex-1 min-h-0 overflow-y-auto p-4 md:px-2 md:py-2 custom-scrollbar relative">
                            <div className="flex flex-col gap-2 min-h-full">
                                <Suspense fallback={
                                    <div className="flex-1 flex items-center justify-center">
                                        <Spinner size="md" />
                                    </div>
                                }>
                                    {messages.length > 0 ? (
                                        <div className="flex flex-col gap-2">
                                            {messages.map((msg, idx) => (
                                                <ChatMessage key={msg.id || idx} {...msg} />
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
                    </LocalErrorBoundary>

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
                            onConnectionSuccess={refetch}
                        />
                    </Suspense>
                </LocalErrorBoundary>
            )}
        </div>
    );
};

export default Dashboard;
