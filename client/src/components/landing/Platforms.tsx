import { FaTwitch, FaYoutube, FaTiktok } from 'react-icons/fa';
import { SiKick } from 'react-icons/si';

const Platforms = () => {
    return (
        <section className="py-12 bg-gray-50 dark:bg-surface-dark/50 border-y border-gray-200 dark:border-surface-border">
            <div className="mx-auto max-w-6xl px-6 lg:px-40">
                <p className="text-center text-slate-500 text-sm font-bold uppercase tracking-widest mb-10">Integración nativa con tus plataformas favoritas</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                        { name: 'Twitch', color: 'text-[#9146FF]', Icon: FaTwitch },
                        { name: 'YouTube', color: 'text-[#FF0000]', Icon: FaYoutube },
                        { name: 'TikTok', color: 'text-slate-900 dark:text-slate-100', Icon: FaTiktok },
                        { name: 'Kick', color: 'text-[#53FC18]', Icon: SiKick },
                    ].map((platform) => (
                        <div key={platform.name} className="flex flex-1 gap-4 rounded-xl border border-gray-200 dark:border-surface-border bg-white dark:bg-background-dark p-6 items-center justify-center hover:border-primary/50 transition-all cursor-default shadow-sm text-slate-900 dark:text-white">
                            <div className={`${platform.color} flex items-center justify-center text-3xl`}>
                                <platform.Icon />
                            </div>
                            <h2 className="text-xl font-bold leading-tight">{platform.name}</h2>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Platforms;
