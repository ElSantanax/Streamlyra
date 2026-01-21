const Hero = () => {
    return (
        <section className="relative pt-16 pb-24 px-6 lg:px-40 overflow-hidden">
            {/* Background Gradient Effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-250 h-150 bg-primary/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="mx-auto flex max-w-300 flex-col lg:flex-row items-center gap-12">
                <div className="flex flex-col gap-8 flex-1 text-center lg:text-left">
                    <h1 className="text-slate-900 dark:text-white text-5xl md:text-7xl font-black leading-[1.1] tracking-[-0.04em] font-display">
                        Domina tus chats en <span className="text-primary">un solo lugar</span>
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl font-normal leading-relaxed max-w-150 mx-auto lg:mx-0 font-body">
                        Gestiona las conversaciones de Twitch, YouTube, Kick y TikTok desde un único panel inteligente. Herramientas profesionales para streamers que buscan crecer.
                    </p>
                </div>

                <div className="flex-1 w-full max-w-150 lg:max-w-none relative">
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-2xl bg-white/70 dark:bg-surface-dark/70 backdrop-blur-xl group">
                        <div className="absolute inset-0 bg-linear-to-tr from-primary/10 to-transparent pointer-events-none"></div>
                        <div className="w-full aspect-4/3 bg-white dark:bg-surface-dark flex flex-col">
                            {/* Mockup Top Bar */}
                            <div className="h-8 bg-gray-100 dark:bg-black/40 border-b border-gray-200 dark:border-white/5 flex items-center px-4 gap-2">
                                <div className="size-2 rounded-full bg-red-500/50"></div>
                                <div className="size-2 rounded-full bg-yellow-500/50"></div>
                                <div className="size-2 rounded-full bg-green-500/50"></div>
                            </div>
                            {/* Mockup Content */}
                            <div className="flex flex-1 overflow-hidden">
                                <div className="w-12 border-r border-gray-200 dark:border-white/5 flex flex-col items-center py-4 gap-4">
                                    <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary"><span className="material-symbols-outlined text-sm">dashboard</span></div>
                                    <div className="size-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-slate-500"><span className="material-symbols-outlined text-sm">chat</span></div>
                                    <div className="size-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-slate-500"><span className="material-symbols-outlined text-sm">analytics</span></div>
                                </div>
                                <div className="flex-1 p-4 flex flex-col gap-4">
                                    <div className="h-8 w-1/3 bg-gray-100 dark:bg-white/5 rounded-lg"></div>
                                    <div className="grid grid-cols-2 gap-4 flex-1">
                                        <div className="rounded-lg bg-gray-100 dark:bg-white/5 p-3 flex flex-col gap-2">
                                            <div className="flex justify-between items-center"><div className="h-3 w-12 bg-primary/30 rounded"></div><div className="size-2 rounded-full bg-primary"></div></div>
                                            <div className="space-y-2">
                                                <div className="h-2 w-full bg-gray-200 dark:bg-white/5 rounded"></div>
                                                <div className="h-2 w-4/5 bg-gray-200 dark:bg-white/5 rounded"></div>
                                            </div>
                                        </div>
                                        <div className="rounded-lg bg-gray-100 dark:bg-white/5 p-3 flex flex-col gap-2">
                                            <div className="flex justify-between items-center"><div className="h-3 w-12 bg-red-500/30 rounded"></div><div className="size-2 rounded-full bg-red-500"></div></div>
                                            <div className="space-y-2">
                                                <div className="h-2 w-full bg-gray-200 dark:bg-white/5 rounded"></div>
                                                <div className="h-2 w-4/5 bg-gray-200 dark:bg-white/5 rounded"></div>
                                            </div>
                                        </div>
                                        <div className="col-span-2 rounded-lg bg-primary/5 border border-primary/20 p-4">
                                            <div className="h-20 bg-linear-to-r from-primary/20 to-transparent rounded"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
