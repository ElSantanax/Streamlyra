import React from 'react';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import Sidebar from '../components/dashboard/Sidebar';
import ChatMessage from '../components/dashboard/ChatMessage';
import ChatInput from '../components/dashboard/ChatInput';

const Dashboard: React.FC = () => {
    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white h-screen flex flex-col overflow-hidden">
            <DashboardHeader />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar />

                <main className="flex-1 flex flex-col min-w-0 bg-background-dark relative">
                    {/* Chat Toolbar */}
                    <div className="h-14 flex items-center px-6 border-b border-surface-border bg-[#111318]/95 backdrop-blur-sm sticky top-0 z-10">
                        <div className="flex items-center gap-2 text-gray-400">
                            <span className="text-xs font-medium">Auto-scroll habilitado</span>
                            <button className="text-primary hover:text-white transition-colors cursor-pointer">
                                <span className="material-symbols-outlined text-[20px]">pause_circle</span>
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-1">
                        <ChatMessage
                            platform="system"
                            user="Sistema"
                            message="Bienvenido al Chat de Streamlyra. Estás conectado a Twitch, YouTube y TikTok."
                            time="12:00 PM"
                        />

                        <ChatMessage
                            platform="twitch"
                            user="PogChampUser"
                            message="Pogchamp! Can't believe you did that 360 noscope! @StreamerName"
                            time="12:04 PM"
                            isSub={true}
                        />

                        <ChatMessage
                            platform="youtube"
                            user="ViewerBR"
                            message="Is this live? Hello from Brazil! 🇧🇷 Love the content."
                            time="12:05 PM"
                        />

                        <ChatMessage
                            platform="tiktok"
                            user="DanceQueen99"
                            message="Sent a Rose"
                            specialMessage="Sent a Rose 🌹 x5"
                            time="12:06 PM"
                            highlighted={true}
                        />

                        <ChatMessage
                            platform="twitch"
                            user="ModMaster"
                            message="Don't forget to follow the rules guys! No spamming caps please."
                            time="12:07 PM"
                            isMod={true}
                        />

                        <ChatMessage
                            platform="twitch"
                            user="GamerX_42"
                            message="What game is next on the list?"
                            time="12:08 PM"
                        />
                    </div>

                    <ChatInput />
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
