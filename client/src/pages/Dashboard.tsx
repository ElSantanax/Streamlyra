import React from 'react';
import DashboardHeader from '../components/DashboardHeader';
import Sidebar from '../components/Sidebar';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';

const Dashboard: React.FC = () => {
    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white h-screen flex flex-col overflow-hidden">
            <DashboardHeader />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar />

                <main className="flex-1 flex flex-col min-w-0 bg-background-dark relative">
                    {/* Chat Toolbar */}
                    <div className="h-14 flex items-center justify-between px-6 border-b border-surface-border bg-[#111318]/95 backdrop-blur-sm sticky top-0 z-10">
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                            <button className="px-3 py-1.5 rounded-full bg-primary text-white text-xs font-bold cursor-pointer">All Messages</button>
                            <button className="px-3 py-1.5 rounded-full bg-surface-dark text-gray-400 hover:text-white hover:bg-surface-border text-xs font-medium border border-surface-border transition-colors cursor-pointer">Mentions</button>
                            <button className="px-3 py-1.5 rounded-full bg-surface-dark text-gray-400 hover:text-white hover:bg-surface-border text-xs font-medium border border-surface-border transition-colors cursor-pointer">Subs Only</button>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                            <span className="text-xs font-medium">Auto-scroll enabled</span>
                            <button className="text-primary hover:text-white transition-colors cursor-pointer">
                                <span className="material-symbols-outlined text-[20px]">pause_circle</span>
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-1">
                        <ChatMessage
                            platform="system"
                            user="System"
                            message="Welcome to Streamlyra Chat. You are connected to Twitch, YouTube, and TikTok."
                            time="12:00 PM"
                        />

                        <ChatMessage
                            platform="twitch"
                            user="PogChampUser"
                            avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuBSUjGOzibsCzxzprpvOhvCWcZoQMqbaPhByi-0ZLJ9p7VOY1jrL4y-e76nuQPNNiBhg-zVBwFYl7TS6t0Cxf5anq0YkMw2lOTnxhmvCTEflgg0MT7W9RdH9S70GMiFP08nP_wTKdyzysT8Y73QWr6FpKd0wtb5rlRbuFPJRziUwmRWIS55jzgbK_ZCskzcgEQRErX8dfSsNZUAA6PI0m9b3naHU3-cZG6TB1wCDwh_ap4f6loUgKcMOD-l_QcVA48-jTLjcemRP7Ap"
                            message="Pogchamp! Can't believe you did that 360 noscope! @StreamerName"
                            time="12:04 PM"
                            isSub={true}
                        />

                        <ChatMessage
                            platform="youtube"
                            user="ViewerBR"
                            avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuAnxFtkolh6hnHqdLWxdtc8Zu40B4QCve-2iQ8TtgKMvfpez7QEBeKpfZg4BmhRqB_IBu3WidpBTw8QukcDlHRp81rHMDC05ro4JTQAQOgVIZ6oP50pa7cFMKXMj1V6Ee-VfyPvmw0CyXMuzhw6Lpq-53ldFHzKBt5jNrTk4iAtC4IXFnqXOBNGR0I1N_KKFHtQdDDkvEg2tltw8NTiLSNq0Sod6QsKy8SlFAxFaqVld2KhP-Wyq3R6DPj7DiemblJqmEPaAuGDLtXR"
                            message="Is this live? Hello from Brazil! 🇧🇷 Love the content."
                            time="12:05 PM"
                        />

                        <ChatMessage
                            platform="tiktok"
                            user="DanceQueen99"
                            avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuCpR8zcC-6akfn892eK8YJb8stnQCCVwKArtziFKSfxdn0w2QXZYoL3S_76mZnkA-zODQb59B9sukCd108s1GVidcJ1ZOL18uDrTrtKnhYsyBuQzWrdqprEDwQHFzBPlZmkDmCy7XMl4Q3FOyi3LE1BYPMjQNE4lIxO1DUMeiXJf8d7OJoH40yKqUFlOMP_l7PfIjxeAdiJtywjm_CKYj3alTctzQ0zZwC4ou1lQYAaBlz8lsR3u7HPkL9tQu-S2CcRq7oAyK42acoN"
                            message="Sent a Rose"
                            specialMessage="Sent a Rose 🌹 x5"
                            time="12:06 PM"
                            highlighted={true}
                        />

                        <ChatMessage
                            platform="twitch"
                            user="ModMaster"
                            avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuC1ZOu4XddXULboiuaSh7OemJA6OxvXxct5N5ZF_oBDFX1pb6YoEhwf456RJxCqsn7JuInzZ_OoPphZkCarIWsJ7mJarT9U5o2yfxk7SHnBhKRnyqEJZC_jU4ofimUn0o8KfqK7vM6r6pyAiXmh3d44IxqhvbdAMxrJuyl7rqf3VjyYvSK2JrSVo8IpUKlIj8T03QoFSJqdfkpE7JdqoJ4Ldnik61N_JrjPtTgguz66QwqrWicDPA-j8Euin9o35KOZ4jR4P3jZG_zT"
                            message="Don't forget to follow the rules guys! No spamming caps please."
                            time="12:07 PM"
                            isMod={true}
                        />

                        <ChatMessage
                            platform="twitch"
                            user="GamerX_42"
                            avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuBfj_k7SMcbMivf9ytxQLssbIABbOBkj5SVj8mVjkeC5KzchEykv3LIsPvmtGtrf1k5EwwzuuULDk7VwG5tXGr0gWF67iX6b_cXRkAga3w_AUY4WXJY2WXjIbKcA3ACatLcNpsOM407ImFiUH0ylcLFXhZkavjgTsWZLckFP1qDnRC21NBYbFE_c3JAr1zq5thkSuROQ--NLuKmh4LkUTA_rtPN0KCMWTekQ0X9r1fcQ_QhMXEaqDpCA2gryydW0xuIYLqiQCL_9DT9"
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
