import { MdLayers, MdAutoGraph, MdAutoAwesome } from 'react-icons/md';
import { useTranslation } from 'react-i18next';

const Features = () => {
    const { t } = useTranslation();

    const features = [
        {
            titleKey: 'features.unifiedChat.title',
            descKey: 'features.unifiedChat.desc',
            Icon: MdLayers,
        },
        {
            titleKey: 'features.realtimeMetrics.title',
            descKey: 'features.realtimeMetrics.desc',
            Icon: MdAutoGraph,
        },
        {
            titleKey: 'features.simplifiedUI.title',
            descKey: 'features.simplifiedUI.desc',
            Icon: MdAutoAwesome,
        },
    ];

    return (
        <section id="features" className="py-12 md:py-24 px-6 lg:px-40">
            <div className="mx-auto max-w-300">
                <div className="flex flex-col gap-4 mb-10 md:mb-16 text-center">
                    <h2 className="text-white text-4xl md:text-5xl font-black tracking-tight font-display">
                        {t('features.title')}
                    </h2>
                    <p className="text-slate-400 text-lg max-w-180 mx-auto font-body">
                        {t('features.subtitle')}
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-white">
                    {features.map((feature) => (
                        <div
                            key={feature.titleKey}
                            className="flex flex-col gap-6 rounded-2xl border border-surface-border bg-surface-dark p-8 hover:shadow-lg hover:bg-surface-dark/80 transition-all group shadow-sm"
                        >
                            <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary transition-transform">
                                <feature.Icon className="text-3xl" />
                            </div>
                            <div className="flex flex-col gap-3">
                                <h3 className="text-2xl font-bold leading-tight">{t(feature.titleKey)}</h3>
                                <p className="text-slate-400 text-base leading-relaxed">{t(feature.descKey)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
