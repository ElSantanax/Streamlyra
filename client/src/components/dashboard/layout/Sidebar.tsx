import { memo } from 'react';
import type { PlatformKey } from '../../../constants/platforms';

// Subcomponentes
import { SidebarMobileHeader } from './sidebar/SidebarMobileHeader';
import { SidebarConnections } from './sidebar/SidebarConnections';
import { SidebarAnalytics } from './sidebar/SidebarAnalytics';
import { SidebarIntegrations } from './sidebar/SidebarIntegrations';
import { SidebarQuickActions } from './sidebar/SidebarQuickActions';

interface SidebarProps {
    onMobileClose?: () => void;
    onAddPlatform?: () => void;
    onDisconnect: (platform: PlatformKey) => void;
    onSearchStream?: (platform: PlatformKey) => void;
    onClearChat?: () => void;
}

const Sidebar = memo(({ onMobileClose, onAddPlatform, onDisconnect, onSearchStream, onClearChat }: SidebarProps) => {
    return (
        <aside className="flex h-full w-full flex-col border-r border-surface-border bg-background-dark p-4 gap-6 overflow-y-auto custom-scrollbar">
            <SidebarMobileHeader onMobileClose={onMobileClose} />

            <div className="flex-1 flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-6">
                {/* 1. Conexiones (Primero en todo) */}
                <div className="order-1 lg:col-start-1 lg:row-start-1 flex flex-col gap-6">
                    <SidebarConnections
                        onAddPlatform={onAddPlatform}
                        onDisconnect={onDisconnect}
                        onSearchStream={onSearchStream}
                    />
                </div>

                {/* 2. Analíticas (Columna derecha) */}
                <div className="order-2 lg:col-start-2 lg:row-start-1 flex flex-col gap-6">
                    <SidebarAnalytics />
                </div>

                {/* 3. Integración OBS (Columna izquierda abajo) */}
                <div className="order-3 lg:col-start-1 lg:row-start-2 flex flex-col mt-auto">
                    <SidebarIntegrations />
                </div>

                {/* 4. Acciones Rápidas (Columna derecha abajo) */}
                <div className="order-4 lg:col-start-2 lg:row-start-2 flex flex-col mt-auto">
                    <SidebarQuickActions onClearChat={onClearChat} />
                </div>
            </div>
        </aside>
    );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
