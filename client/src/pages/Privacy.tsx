import { useTranslation } from 'react-i18next';
import Navbar from '../components/common/Navbar';
import Footer from '../components/landing/Footer';

const Privacy = () => {
    const { t } = useTranslation();

    const sections = [
        'data',
        'storage',
        'noSharing'
    ];

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-background-dark text-white transition-colors duration-300">
            <Navbar />
            <main className="flex-1 px-6 py-20 lg:px-40">
                <div className="mx-auto max-w-3xl">
                    <h1 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
                        {t('legal.privacy.title')}
                    </h1>
                    <p className="mb-12 text-slate-400">
                        {t('legal.privacy.lastUpdated')}
                    </p>

                    <div className="space-y-12">
                        {sections.map((section) => (
                            <section key={section} className="space-y-4">
                                <h2 className="text-2xl font-semibold text-primary">
                                    {t(`legal.privacy.sections.${section}.title`)}
                                </h2>
                                <p className="leading-relaxed text-slate-300">
                                    {t(`legal.privacy.sections.${section}.content`)}
                                </p>
                            </section>
                        ))}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Privacy;
