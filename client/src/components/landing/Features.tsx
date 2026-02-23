import { MdLayers, MdAutoGraph, MdAutoAwesome } from 'react-icons/md';

const Features = () => {
    return (
        <section id="features" className="py-12 md:py-24 px-6 lg:px-40">
            <div className="mx-auto max-w-300">
                <div className="flex flex-col gap-4 mb-10 md:mb-16 text-center">
                    <h2 className="text-white text-4xl md:text-5xl font-black tracking-tight font-display">Centraliza la interacción con tu comunidad</h2>
                    <p className="text-slate-400 text-lg max-w-180 mx-auto font-body">Todo lo que necesitas para leer y moderar tus chats sin cambiar de pestaña.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-white">
                    {[
                        { title: 'Chat Unificado', desc: 'Gestiona mensajes de múltiples plataformas en una sola columna optimizada.', Icon: MdLayers },
                        { title: 'Métricas en Tiempo Real', desc: 'Visualiza el flujo de actividad y el estado de tus conexiones al instante.', Icon: MdAutoGraph },
                        { title: 'Interfaz Simplificada', desc: 'Un entorno libre de distracciones diseñado para no interrumpir tu flujo de trabajo.', Icon: MdAutoAwesome },
                    ].map((feature) => (
                        <div key={feature.title} className="flex flex-col gap-6 rounded-2xl border border-surface-border bg-surface-dark p-8 hover:shadow-lg hover:bg-surface-dark/80 transition-all group shadow-sm">
                            <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary transition-transform">
                                <feature.Icon className="text-3xl" />
                            </div>
                            <div className="flex flex-col gap-3">
                                <h3 className="text-2xl font-bold leading-tight">{feature.title}</h3>
                                <p className="text-slate-400 text-base leading-relaxed">{feature.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
