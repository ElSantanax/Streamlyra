import React from 'react';
import { FaTwitch, FaYoutube, FaTiktok } from 'react-icons/fa';
import { SiKick } from 'react-icons/si';
import { MdDeleteSweep } from 'react-icons/md';
import SidebarSection from './Sidebar/SidebarSection';
import ConnectionItem from './Sidebar/ConnectionItem';
import StatCard from './Sidebar/StatCard';

const Sidebar: React.FC = () => {
    return (
        <aside className="hidden lg:flex w-80 flex-col border-r border-surface-border bg-[#111318] p-4 gap-6 overflow-y-auto">
            <SidebarSection title="Conexiones">
                <ConnectionItem
                    platform="Twitch"
                    Icon={FaTwitch}
                    status="connected"
                    viewers="850"
                    iconColor="text-[#9146FF]"
                    bgColor="bg-[#9146FF]/20"
                    isConnected={true}
                />
                <ConnectionItem
                    platform="YouTube"
                    Icon={FaYoutube}
                    status="connected"
                    viewers="320"
                    iconColor="text-[#FF0000]"
                    bgColor="bg-[#FF0000]/20"
                    isConnected={true}
                />
                <ConnectionItem
                    platform="TikTok"
                    Icon={FaTiktok}
                    status="connected"
                    viewers="70"
                    iconColor="text-white"
                    bgColor="bg-black/40"
                    isConnected={true}
                />
                <ConnectionItem
                    platform="Kick"
                    Icon={SiKick}
                    status="disconnected"
                    iconColor="text-[#53FC18]"
                    bgColor="bg-[#53FC18]/20"
                    isConnected={false}
                />
            </SidebarSection>

            <SidebarSection title="Analíticas en Vivo">
                <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Espectadores Totales" value="1,240" />
                    <StatCard label="Nuevos Subs" value="12" valueColor="text-primary" />
                    <StatCard label="Tiempo al Aire" value="2h 14m" />
                    <StatCard label="Me gusta" value="8.5k" />
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
