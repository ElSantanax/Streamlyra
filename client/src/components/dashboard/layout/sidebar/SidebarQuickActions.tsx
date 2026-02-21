import { memo } from 'react';
import { MdDeleteSweep } from 'react-icons/md';
import { SidebarSection } from './SidebarSection';

interface SidebarQuickActionsProps {
    onClearChat?: () => void;
}

export const SidebarQuickActions = memo(({ onClearChat }: SidebarQuickActionsProps) => (
    <SidebarSection title="Acciones Rápidas" className="mt-auto">
        <div className="flex flex-col gap-2">
            <button
                onClick={onClearChat}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
                <MdDeleteSweep size={20} /> Limpiar Chat
            </button>
        </div>
    </SidebarSection>
));

SidebarQuickActions.displayName = 'SidebarQuickActions';
