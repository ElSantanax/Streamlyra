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
                <div className="hidden md:flex items-center gap-2 bg-surface-dark px-3 py-1.5 rounded-lg border border-surface-border mr-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">visibility</span>
                    <span className="text-sm font-bold text-white">1,240 Viewers</span>
                </div>

                <button className="flex items-center justify-center size-9 rounded-lg bg-surface-dark text-gray-400 hover:text-white hover:bg-surface-border transition-colors cursor-pointer">
                    <span className="material-symbols-outlined">notifications</span>
                </button>

                <button className="flex items-center justify-center size-9 rounded-lg bg-surface-dark text-gray-400 hover:text-white hover:bg-surface-border transition-colors cursor-pointer">
                    <span className="material-symbols-outlined">settings</span>
                </button>

                <div
                    className="size-9 rounded-full bg-cover bg-center ml-2 border border-surface-border"
                    title="User Profile"
                    style={{
                        backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBjvG4MdjItT_9b854MFsdGKr5v1f18LdJVt3t94W_LExV_kB-ArSM_DYTqxVSmIXEZMpFn_9R_arJZfoHctThouOpYYcb09aTAoWsco1PmbuQrlVwra_coKWuiFb2dty1CaCr3fj94PMcXWXdSl21zvziljyFGGWO0GO80Jmm98KqIoEM6KVrRwpWPMDxaNXo5nJTDkC_9wtP9WsU2S3bsYHye08h2E5hm-PVOhKKabs4y1XTUws0W7gtFF1Nc-2n72hhh29o1zHPz")'
                    }}
                >
                </div>
            </div>
        </header>
    );
};

export default DashboardHeader;
