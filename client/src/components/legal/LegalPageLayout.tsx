import { useTranslation } from 'react-i18next';
import Navbar from '../common/Navbar';
import Footer from '../landing/Footer';

interface LegalPageLayoutProps {
    type: 'privacy' | 'terms';
    sections: string[];
}

const LegalPageLayout = ({ type, sections }: LegalPageLayoutProps) => {
    const { t } = useTranslation();

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-background-dark text-white transition-colors duration-300">
            <Navbar />
            <main className="flex-1 px-6 py-20 lg:px-40">
                <div className="mx-auto max-w-3xl">
                    <h1 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
                        {t(`legal.${type}.title`)}
                    </h1>
                    <p className="mb-12 text-slate-400">
                        {t(`legal.${type}.lastUpdated`)}
                    </p>

                    <div className="space-y-12">
                        {sections.map((section) => (
                            <section key={section} className="space-y-4">
                                <h2 className="text-2xl font-semibold text-primary">
                                    {t(`legal.${type}.sections.${section}.title`)}
                                </h2>
                                <p className="leading-relaxed text-slate-300">
                                    {t(`legal.${type}.sections.${section}.content`)}
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

export default LegalPageLayout;
