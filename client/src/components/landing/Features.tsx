const Features = () => {
    return (
        <section id="features" className="py-12 md:py-24 px-6 lg:px-40">
            <div className="mx-auto max-w-300">
                <div className="flex flex-col gap-4 mb-10 md:mb-16 text-center">
                    <h2 className="text-slate-900 dark:text-white text-4xl md:text-5xl font-black tracking-tight font-display">Lleva tu streaming al siguiente nivel</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-lg max-w-180 mx-auto font-body">Todo lo que necesitas para gestionar tu comunidad de forma eficiente y profesional sin cambiar de pestaña.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-slate-900 dark:text-white">
                    {[
                        { title: 'Conexión Multi-plataforma', desc: 'Lee y responde chats de múltiples fuentes en una sola ventana optimizada para rendimiento.', icon: 'layers' },
                        { title: 'Estadísticas en Vivo', desc: 'Visualiza el crecimiento de tu audiencia y el engagement por plataforma en tiempo real.', icon: 'monitoring' },
                        { title: 'Diseño Minimalista', desc: 'Interfaz limpia y sin distracciones, diseñada para streamers.', icon: 'auto_awesome' },
                    ].map((feature) => (
                        <div key={feature.title} className="flex flex-col gap-6 rounded-2xl border border-gray-200 dark:border-surface-border bg-white dark:bg-surface-dark p-8 hover:shadow-lg dark:hover:bg-surface-dark/80 transition-all group shadow-sm">
                            <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary transition-transform">
                                <span className="material-symbols-outlined text-3xl">{feature.icon}</span>
                            </div>
                            <div className="flex flex-col gap-3">
                                <h3 className="text-2xl font-bold leading-tight">{feature.title}</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">{feature.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
