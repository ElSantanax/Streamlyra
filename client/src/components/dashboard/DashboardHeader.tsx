import React from 'react';

const DashboardHeader: React.FC = () => {
    return (
        <header className="shrink-0 border-b border-surface-border bg-background-dark px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-4">
                <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">forum</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white">Streamlyra Chat</h1>
            </div>

            <div className="flex items-center gap-3">
                <button className="flex items-center justify-center size-9 rounded-lg bg-surface-dark text-gray-400 hover:text-white hover:bg-surface-border transition-colors cursor-pointer">
                    <span className="material-symbols-outlined">notifications</span>
                </button>

                <button className="flex items-center justify-center size-9 rounded-lg bg-surface-dark text-gray-400 hover:text-white hover:bg-surface-border transition-colors cursor-pointer">
                    <span className="material-symbols-outlined">settings</span>
                </button>
            </div>
        </header>
    );
};

export default DashboardHeader;
