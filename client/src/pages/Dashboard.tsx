import { useState, lazy, Suspense, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import Spinner from '../components/common/Spinner';
import Overlay from '../components/common/Overlay';
import { socket } from '../services/socket';
import type { ChatMessageProps } from '../components/dashboard/ChatMessage';

const Sidebar = lazy(() => import('../components/dashboard/Sidebar'));
const ChatMessage = lazy(() => import('../components/dashboard/ChatMessage'));
const ChatInput = lazy(() => import('../components/dashboard/ChatInput/index'));

const AddPlatformModal = lazy(() => import('../components/dashboard/AddPlatformModal'));

interface User {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
}

interface ConnectionInfo {
    connected: boolean;
    username?: string;
}

interface MeResponse {
    user: User;
    connections: Record<string, ConnectionInfo>;
}

const Dashboard = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isAddPlatformOpen, setIsAddPlatformOpen] = useState(false);
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [messages, setMessages] = useState<(ChatMessageProps & { id?: string })[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll al fondo cuando llegan mensajes nuevos
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    interface ViewersUpdate {
        platform: string;
        count: number;
    }

    const [userConnections, setUserConnections] = useState<Record<string, { connected: boolean; username?: string; viewers?: number; status?: 'connecting' | 'connected' | 'error'; statusMessage?: string }>>({
        twitch: { connected: false },
        youtube: { connected: false },
        tiktok: { connected: false },
        kick: { connected: false }
    });

    useEffect(() => {
        // Obtenemos el usuario guardado para identificarnos
        const userStr = localStorage.getItem('user');
        const user = userStr ? (JSON.parse(userStr) as User) : null;

        if (!user) {
            navigate('/login');
            return;
        }

        // Conectar al socket al montar el dashboard
        if (!socket.connected) {
            socket.connect();
        }

        function onConnect() {
            setIsConnected(true);
            // Decirle al backend quiénes somos
            if (user) socket.emit('identify', user.id);
        }

        function onDisconnect() {
            setIsConnected(false);
        }

        function onChatMessage(msg: ChatMessageProps & { id?: string }) {
            console.log('📬 Mensaje recibido:', msg);
            setMessages(prev => {
                // Limitamos el historial en pantalla a 100 mensajes para rendimiento
                if (prev.length > 100) {
                    return [...prev.slice(1), msg];
                }
                return [...prev, msg];
            });
        }

        function onViewersUpdate(data: ViewersUpdate) {
            setUserConnections(prev => ({
                ...prev,
                [data.platform]: {
                    ...prev[data.platform],
                    viewers: data.count
                }
            }));
        }

        interface ConnectionStatusUpdate {
            platform: string;
            status: 'connecting' | 'connected' | 'error';
            message?: string;
        }

        function onConnectionStatus(data: ConnectionStatusUpdate) {
            setUserConnections(prev => ({
                ...prev,
                [data.platform]: {
                    ...prev[data.platform],
                    status: data.status,
                    statusMessage: data.message
                }
            }));
        }

        // Listeners
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('chat_message', onChatMessage);
        socket.on('viewers_update', onViewersUpdate);
        socket.on('connection_status', onConnectionStatus);

        // Si ya estaba conectado de antes
        if (socket.connected) {
            onConnect();
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('chat_message', onChatMessage);
            socket.off('viewers_update', onViewersUpdate);
            socket.off('connection_status', onConnectionStatus);
            // No desconectamos al desmontar para navegación fluida
        };
    }, [navigate]);

    // Cargar perfil y conexiones
    useEffect(() => {
        const fetchUserData = async () => {
            const userStr = localStorage.getItem('user');
            const user = userStr ? (JSON.parse(userStr) as User) : null;
            if (!user) return;

            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const data = (await response.json()) as MeResponse;
                    setUserConnections(data.connections);
                } else if (response.status === 401 || response.status === 404) {
                    // Si el token es inválido o el usuario no existe en DB, fuera
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    navigate('/login');
                }
            } catch (error) {
                console.error('Error fetching connections:', error);
            }
        };

        fetchUserData();
    }, [isAddPlatformOpen, navigate]); // Re-fetch al cerrar/abrir modal por si hubo cambios

    const handleDisconnect = async (provider: string) => {
        const userStr = localStorage.getItem('user');
        const user = userStr ? (JSON.parse(userStr) as User) : null;
        if (!user) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/auth/platform', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ provider })
            });

            if (response.ok) {
                // Actualizar estado local inmediatamente
                setUserConnections(prev => ({
                    ...prev,
                    [provider]: { connected: false }
                }));
            }
        } catch (error) {
            console.error('Error disconnecting platform:', error);
        }
    };

    return (
        <div className="page-base h-screen overflow-hidden">
            <DashboardHeader
                onMenuClick={() => setIsSidebarOpen(true)}
                onAddPlatform={() => setIsAddPlatformOpen(true)}
                isConnected={isConnected}
            />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Backdrops centralizados con Overlay */}
                <Overlay
                    isVisible={isAddPlatformOpen}
                    onClose={() => setIsAddPlatformOpen(false)}
                    className="lg:hidden"
                />
                <Overlay
                    isVisible={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    className="lg:hidden"
                />

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
                    <div className={`
                        fixed inset-y-0 left-0 w-80 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:z-0
                        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    `}>
                        <Sidebar
                            onMobileClose={() => setIsSidebarOpen(false)}
                            onAddPlatform={() => {
                                setIsAddPlatformOpen(true);
                                setIsSidebarOpen(false); // Close sidebar on mobile after clicking
                            }}
                            connections={userConnections}
                            onDisconnect={handleDisconnect}
                        />
                    </div>
                </Suspense>

                <main className="flex-1 flex flex-col min-w-0 bg-background-dark relative">

                    {/* Messages Area */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 md:px-2 md:py-2 custom-scrollbar">
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

                    <Suspense fallback={<div className="h-24 bg-background-dark border-t border-surface-border"></div>}>
                        <ChatInput />
                    </Suspense>
                </main>
            </div>

            {isAddPlatformOpen && (
                <Suspense fallback={null}>
                    <AddPlatformModal
                        isOpen={isAddPlatformOpen}
                        onClose={() => setIsAddPlatformOpen(false)}
                        connections={userConnections}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default Dashboard;
