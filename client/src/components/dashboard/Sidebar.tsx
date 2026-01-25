import { type ReactNode } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import { MdDeleteOutline, MdOutlineVisibility, MdDeleteSweep } from 'react-icons/md';
import { PLATFORMS } from '../../constants/platforms';
import type { PlatformKey } from '../../constants/platforms';
import Spinner from '../common/Spinner';

// --- Local Components (KISS: Co-located for internal use) ---

interface SidebarSectionProps {
    title: string;
    children: ReactNode;
    className?: string;
}

const SidebarSection = ({ title, children, className = "" }: SidebarSectionProps) => (
    <div className={`flex flex-col gap-3 ${className}`}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{title}</h3>
        {children}
    </div>
);

interface ConnectionItemProps {
    platformKey: PlatformKey;
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    viewers?: string;
    statusMessage?: string;
    onDisconnect?: () => void;
}

const ConnectionItem = ({
    platformKey,
    status,
    viewers,
    statusMessage,
    onDisconnect
}: ConnectionItemProps) => {
    const { name, Icon, color, iconColor } = PLATFORMS[platformKey];
    const isConnected = status === 'connected';
    const isConnecting = status === 'connecting';
    const isError = status === 'error';

    return (
        <div className={`flex items-center justify-between p-3 rounded-lg bg-surface-dark border border-surface-border ${!isConnected && !isConnecting ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center size-8 rounded-full ${color} ${iconColor}`}>
                    <Icon size={platformKey === 'tiktok' ? 14 : 16} />
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold leading-none">{name}</span>
                        {isConnecting && <Spinner size="xs" />}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                        {isConnecting ? (
                            <span className="text-xs text-blue-400">Conectando...</span>
                        ) : isError ? (
                            <span className="text-xs text-yellow-400">{statusMessage || 'Error'}</span>
                        ) : isConnected ? (
                            <>
                                <span className="text-xs text-green-400">Conectado</span>
                                {viewers && (
                                    <>
                                        <span className="text-[10px] text-gray-600">•</span>
                                        <div className="flex items-center gap-1 text-gray-400">
                                            <MdOutlineVisibility size={12} />
                                            <span className="text-xs">{viewers}</span>
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <span className="text-xs text-red-400">Desconectado</span>
                        )}
                    </div>
                </div>
            </div>
            {(isConnected || isConnecting || isError) ? (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        const action = isConnecting ? 'cancelar' : 'desconectar';
                        if (window.confirm(`¿Estás seguro de ${action} ${name}?`)) {
                            onDisconnect?.();
                        }
                    }}
                    className="flex items-center justify-center p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-lg transition-all duration-200 cursor-pointer"
                    title={isConnecting ? "Cancelar conexión" : "Desconectar"}
                >
                    <MdDeleteOutline size={18} />
                </button>
            ) : (
                <div className="size-2 rounded-full bg-red-500"></div>
            )}
        </div>
    );
};

interface StatCardProps {
    label: string;
    value: string;
    valueColor?: string;
    className?: string;
}

const StatCard = ({ label, value, valueColor = "text-white", className = "" }: StatCardProps) => (
    <div className={`p-4 py-3 rounded-lg bg-surface-dark border border-surface-border flex items-center justify-between gap-3 ${className}`}>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        <span className={`text-base font-black ${valueColor}`}>{value}</span>
    </div>
);

// --- Main Sidebar Component ---
interface SidebarProps {
    onMobileClose?: () => void;
    onAddPlatform?: () => void;
    connections: Record<string, {
        connected: boolean;
        username?: string;
        viewers?: number;
        status?: 'connecting' | 'connected' | 'error';
        statusMessage?: string;
    }>;
    onDisconnect: (platform: PlatformKey) => void;
}

const Sidebar = ({ onMobileClose, onAddPlatform, connections, onDisconnect }: SidebarProps) => {

    // Calcular espectadores totales
    const totalViewers = Object.values(connections).reduce((acc, curr) => acc + (curr.viewers || 0), 0);

    const formatNumber = (num: number) => {
        if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
        return num.toString();
    };

    return (
        <aside className="flex h-full w-full flex-col border-r border-surface-border bg-background-dark p-4 gap-6 overflow-y-auto custom-scrollbar">
            {/* Mobile Header for Sidebar */}
            <div className="flex items-center justify-between lg:hidden mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Menú de Control</span>
                <button
                    onClick={onMobileClose}
                    className="p-2 text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                    <FaTimes size={18} />
                </button>
            </div>

            <SidebarSection title="Conexiones">
                {Object.entries(connections).filter(([, data]) => data.connected || data.status === 'connecting' || data.status === 'error').length > 0 ? (
                    Object.entries(connections)
                        .filter(([, data]) => data.connected || data.status === 'connecting' || data.status === 'error')
                        .map(([key, data]) => {
                            const status = data.status === 'connecting'
                                ? 'connecting'
                                : data.status === 'error'
                                    ? 'error'
                                    : data.connected
                                        ? 'connected'
                                        : 'disconnected';

                            return (
                                <ConnectionItem
                                    key={key}
                                    platformKey={key as PlatformKey}
                                    status={status}
                                    viewers={data.viewers !== undefined ? formatNumber(data.viewers) : undefined}
                                    statusMessage={data.statusMessage}
                                    onDisconnect={() => onDisconnect(key as PlatformKey)}
                                />
                            );
                        })
                ) : (
                    <div className="p-4 text-center border border-dashed border-surface-border rounded-lg bg-surface-dark/30">
                        <p className="text-xs text-gray-500">No hay plataformas conectadas</p>
                    </div>
                )}

                <button
                    onClick={onAddPlatform}
                    className="flex items-center gap-3 w-full p-3 rounded-lg bg-surface-dark/50 border border-dashed border-surface-border hover:bg-surface-dark hover:border-primary/50 transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <FaPlus size={14} />
                    </div>
                    <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">Agregar plataforma</span>
                </button>
            </SidebarSection>


            <SidebarSection title="Analíticas en Vivo">
                <div className="grid grid-cols-1 gap-3">
                    <StatCard label="Espectadores Totales" value={formatNumber(totalViewers)} />
                    <StatCard label="Tiempo al Aire" value="00h 00m 00s" />
                </div>
            </SidebarSection>

            <SidebarSection title="Acciones Rápidas" className="mt-auto">
                <div className="flex flex-col gap-2">
                    <button className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer">
                        <MdDeleteSweep size={20} /> Limpiar Chat
                    </button>
                </div>
            </SidebarSection>
        </aside>
    );
};

export default Sidebar;
