import { useState, lazy, Suspense, type ReactNode } from 'react';
import { FaPlus } from 'react-icons/fa';
import { MdDeleteSweep, MdDeleteOutline, MdOutlineVisibility } from 'react-icons/md';
import { PLATFORMS } from '../../constants/platforms';
import type { PlatformKey } from '../../constants/platforms';
const AddPlatformModal = lazy(() => import('./AddPlatformModal'));

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
    status: 'connected' | 'disconnected';
    viewers?: string;
    onDisconnect?: () => void;
}

const ConnectionItem = ({
    platformKey,
    status,
    viewers,
    onDisconnect
}: ConnectionItemProps) => {
    const { name, Icon, color, iconColor } = PLATFORMS[platformKey];
    const isConnected = status === 'connected';

    return (
        <div className={`flex items-center justify-between p-3 rounded-lg bg-surface-dark border border-surface-border ${!isConnected ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center size-8 rounded-full ${color} ${iconColor}`}>
                    <Icon size={platformKey === 'tiktok' ? 14 : 16} />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold leading-none">{name}</span>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                            {isConnected ? 'Conectado' : 'Desconectado'}
                        </span>
                        {isConnected && viewers && (
                            <>
                                <span className="text-[10px] text-gray-600">•</span>
                                <div className="flex items-center gap-1 text-gray-400">
                                    <MdOutlineVisibility size={12} />
                                    <span className="text-xs">{viewers}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            {isConnected ? (
                <button
                    onClick={(e) => { e.stopPropagation(); onDisconnect?.(); }}
                    className="flex items-center justify-center p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-lg transition-all duration-200 cursor-pointer"
                    title="Desconectar"
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

const Sidebar = () => {
    const [isAddPlatformOpen, setIsAddPlatformOpen] = useState(false);

    return (
        <aside className="hidden lg:flex w-80 flex-col border-r border-surface-border bg-background-dark p-4 gap-6 overflow-y-auto custom-scrollbar">
            <SidebarSection title="Conexiones">
                {[
                    { key: 'twitch', status: 'connected', viewers: '850' },
                    { key: 'youtube', status: 'connected', viewers: '320' },
                    { key: 'tiktok', status: 'connected', viewers: '70' },
                    { key: 'kick', status: 'disconnected' }
                ].map((conn) => (
                    <ConnectionItem
                        key={conn.key}
                        platformKey={conn.key as PlatformKey}
                        status={conn.status as 'connected' | 'disconnected'}
                        viewers={conn.viewers}
                    />
                ))}

                <button
                    onClick={() => setIsAddPlatformOpen(true)}
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
                    <StatCard label="Espectadores Totales" value="1,240" />
                    <StatCard label="Tiempo al Aire" value="12h 14m 29s" />
                </div>
            </SidebarSection>

            <SidebarSection title="Acciones Rápidas" className="mt-auto">
                <div className="flex flex-col gap-2">
                    <button className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer">
                        <MdDeleteSweep size={20} /> Limpiar Chat
                    </button>
                </div>
            </SidebarSection>

            {isAddPlatformOpen && (
                <Suspense fallback={null}>
                    <AddPlatformModal
                        isOpen={isAddPlatformOpen}
                        onClose={() => setIsAddPlatformOpen(false)}
                    />
                </Suspense>
            )}
        </aside>
    );
};

export default Sidebar;
