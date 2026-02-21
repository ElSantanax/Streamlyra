import { memo } from 'react';
import type { PlatformKey } from '../../../constants/platforms';

// Subcomponentes
import { SidebarMobileHeader } from './sidebar/SidebarMobileHeader';
import { SidebarConnections } from './sidebar/SidebarConnections';
import { SidebarAnalytics } from './sidebar/SidebarAnalytics';
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

            <SidebarConnections
                onAddPlatform={onAddPlatform}
                onDisconnect={onDisconnect}
                onSearchStream={onSearchStream}
            />

            <SidebarAnalytics />

            <SidebarQuickActions onClearChat={onClearChat} />
        </aside>
    );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
