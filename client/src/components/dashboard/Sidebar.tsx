import React from 'react';
import { FaTwitch, FaYoutube, FaTiktok } from 'react-icons/fa';
import { SiKick } from 'react-icons/si';
import { MdDeleteSweep } from 'react-icons/md';

const Sidebar: React.FC = () => {
    return (
        <aside className="hidden lg:flex w-80 flex-col border-r border-surface-border bg-[#111318] p-4 gap-6 overflow-y-auto">
            <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Conexiones</h3>

                {/* Twitch Connection */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-dark border border-surface-border">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-8 rounded-full bg-[#9146FF]/20 text-[#9146FF]">
                            <FaTwitch size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold leading-none">Twitch</span>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-xs text-green-400">Conectado</span>
                                <span className="text-[10px] text-gray-600">•</span>
                                <span className="text-xs text-gray-400">850 espectadores</span>
                            </div>
                        </div>
                    </div>
                    <div className="size-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                </div>

                {/* YouTube Connection */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-dark border border-surface-border">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-8 rounded-full bg-[#FF0000]/20 text-[#FF0000]">
                            <FaYoutube size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold leading-none">YouTube</span>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-xs text-green-400">Conectado</span>
                                <span className="text-[10px] text-gray-600">•</span>
                                <span className="text-xs text-gray-400">320 espectadores</span>
                            </div>
                        </div>
                    </div>
                    <div className="size-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                </div>

                {/* TikTok Connection */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-dark border border-surface-border">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-8 rounded-full bg-black/40 text-white border border-gray-700">
                            <FaTiktok size={14} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold leading-none">TikTok</span>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-xs text-green-400">Conectado</span>
                                <span className="text-[10px] text-gray-600">•</span>
                                <span className="text-xs text-gray-400">70 espectadores</span>
                            </div>
                        </div>
                    </div>
                    <div className="size-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                </div>

                {/* Kick Connection - Disconnected */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-dark border border-surface-border opacity-60">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-8 rounded-full bg-[#53FC18]/20 text-[#53FC18]">
                            <SiKick size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold leading-none">Kick</span>
                            <span className="text-xs text-red-400 mt-1">Desconectado</span>
                        </div>
                    </div>
                    <div className="size-2 rounded-full bg-red-500"></div>
                </div>
            </div>

            {/* Live Analytics */}
            <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Analíticas en Vivo</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-lg bg-surface-dark border border-surface-border flex flex-col gap-1">
                        <span className="text-xs text-gray-400">Espectadores Totales</span>
                        <span className="text-2xl font-bold text-white">1,240</span>
                    </div>
                    <div className="p-4 rounded-lg bg-surface-dark border border-surface-border flex flex-col gap-1">
                        <span className="text-xs text-gray-400">Nuevos Subs</span>
                        <span className="text-2xl font-bold text-primary">12</span>
                    </div>
                    <div className="p-4 rounded-lg bg-surface-dark border border-surface-border flex flex-col gap-1">
                        <span className="text-xs text-gray-400">Tiempo al Aire</span>
                        <span className="text-xl font-bold text-white">2h 14m</span>
                    </div>
                    <div className="p-4 rounded-lg bg-surface-dark border border-surface-border flex flex-col gap-1">
                        <span className="text-xs text-gray-400">Me gusta</span>
                        <span className="text-xl font-bold text-white">8.5k</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-auto">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Acciones Rápidas</h3>
                <div className="flex flex-col gap-2">
                    <button className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer">
                        <MdDeleteSweep size={20} /> Limpiar Chat
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
