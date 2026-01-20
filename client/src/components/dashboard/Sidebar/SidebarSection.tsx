import React from 'react';

interface SidebarSectionProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({ title, children, className = "" }) => {
    return (
        <div className={`flex flex-col gap-3 ${className}`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{title}</h3>
            {children}
        </div>
    );
};

export default SidebarSection;
