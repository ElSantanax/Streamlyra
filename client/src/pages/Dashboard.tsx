import React, { lazy, Suspense } from 'react';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import type { PlatformKey } from '../constants/platforms';

const Sidebar = lazy(() => import('../components/dashboard/Sidebar'));
const ChatMessage = lazy(() => import('../components/dashboard/ChatMessage'));
const ChatInput = lazy(() => import('../components/dashboard/ChatInput/index'));

interface Message {
    platform: PlatformKey;
    user: string;
    message: string;
    time: string;
    isSub?: boolean;
    isMod?: boolean;
    specialMessage?: string;
}

const SAMPLE_MESSAGES: Message[] = [
    {
        platform: 'system',
        user: 'Sistema',
        message: 'Bienvenido al Chat de Streamlyra. Estás conectado a Twitch, YouTube y TikTok. Todos los servicios están funcionando correctamente.',
        time: '12:00 PM'
    },
    {
        platform: 'twitch',
        user: 'PogChampUser',
        message: "Pogchamp! Can't believe you did that 360 noscope! @StreamerName",
        time: '12:04 PM',
        isSub: true
    },
    {
        platform: 'youtube',
        user: 'ViewerBR',
        message: 'Is this live? Hello from Brazil! 🇧🇷 Love the content and the new setup looks amazing.',
        time: '12:05 PM'
    },
    {
        platform: 'tiktok',
        user: 'DanceQueen99',
        message: 'Sent a Rose',
        specialMessage: 'Sent a Rose 🌹 x5',
        time: '12:06 PM'
    },
    {
        platform: 'twitch',
        user: 'ModMaster',
        message: "Don't forget to follow the rules guys! No spamming caps please. We want to keep the chat clean and friendly for everyone joining the stream today",
        time: '12:07 PM',
        isMod: true
    },
    {
        platform: 'youtube',
        user: 'TechGuru',
        message: "I've been following your progress for months and I must say the quality of your stream has improved significantly. The way you interact with the audience while maintaining high-level gameplay is truly impressive. Keep up the great work!",
        time: '12:10 PM'
    },
    {
        platform: 'tiktok',
        user: 'SuperFan_TikTok',
        message: 'Sent a Galaxy',
        specialMessage: 'Sent a Galaxy 🌌',
        time: '12:12 PM'
    },
    {
        platform: 'twitch',
        user: 'GiftKing',
        message: 'Gifting 5 subs',
        specialMessage: 'Gifting 5 T1 Subs to the community! 🎁',
        time: '12:16 PM',
        isSub: true
    },
    {
        platform: 'twitch',
        user: 'GiftKing',
        message: 'Gifting 5 subs',
        specialMessage: 'Gifting 5 T1 Subs to the community! 🎁',
        time: '12:16 PM',
        isSub: true
    }
];

// const SAMPLE_MESSAGES: Message[] = []; // No borrar para probar

const Dashboard: React.FC = () => {
    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white h-screen flex flex-col overflow-hidden">
            <DashboardHeader />

            <div className="flex flex-1 overflow-hidden">
                <Suspense fallback={
                    <aside className="hidden lg:flex w-80 flex-col border-r border-surface-border bg-background-dark p-4 gap-6 overflow-y-auto">
                        <div className="h-4 w-24 bg-gray-700/50 rounded mb-6"></div>
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-16 bg-surface-dark rounded-lg border border-surface-border"></div>
                            ))}
                        </div>
                    </aside>
                }>
                    <Sidebar />
                </Suspense>

                <main className="flex-1 flex flex-col min-w-0 bg-background-dark relative">

                    {/* Messages Area */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 md:px-6 md:py-2 custom-scrollbar">
                        <div className="flex flex-col gap-2 min-h-full">
                            <Suspense fallback={
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="size-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                </div>
                            }>
                                {SAMPLE_MESSAGES.length > 0 ? (
                                    SAMPLE_MESSAGES.map((msg, idx) => (
                                        <ChatMessage key={idx} {...msg} />
                                    ))
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 select-none pb-20">
                                        <div className="bg-surface-dark p-6 rounded-full mb-4 ring-4 ring-surface-border animate-pulse">
                                            <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2">Todo está muy tranquilo...</h3>
                                        <p className="text-gray-400 max-w-xs mx-auto">
                                            Esperando el primer mensaje para comenzar la conversación.
                                        </p>
                                    </div>
                                )}
                            </Suspense>
                        </div>
                    </div>

                    <Suspense fallback={<div className="h-24 bg-background-dark border-t border-surface-border"></div>}>
                        <ChatInput />
                    </Suspense>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
