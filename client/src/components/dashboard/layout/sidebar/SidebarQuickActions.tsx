import { memo } from 'react';
import { MdDeleteSweep } from 'react-icons/md';
import { SidebarSection } from './SidebarSection';

interface SidebarQuickActionsProps {
    onClearChat?: () => void;
}

export const SidebarQuickActions = memo(({ onClearChat }: SidebarQuickActionsProps) => (
    <SidebarSection title="Acciones Rápidas">
        <div className="flex flex-col gap-2">
            <button
                onClick={onClearChat}
                className="w-full bg-red-500/5 hover:bg-red-500/10 text-red-500 border border-red-500/10 px-3 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
                <MdDeleteSweep size={18} className="opacity-80" />
                <span>Limpiar Chat</span>
            </button>
        </div>
    </SidebarSection>
));

SidebarQuickActions.displayName = 'SidebarQuickActions';
