import { memo, type ReactNode } from 'react';

interface SidebarSectionProps {
    title: string;
    children: ReactNode;
    className?: string;
}

export const SidebarSection = memo(({ title, children, className = "" }: SidebarSectionProps) => (
    <div className={`flex flex-col gap-3 ${className}`}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
            {title}
        </h3>
        {children}
    </div>
));

SidebarSection.displayName = 'SidebarSection';
