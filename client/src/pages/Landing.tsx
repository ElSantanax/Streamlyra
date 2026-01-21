import { lazy, Suspense } from 'react';
import Navbar from '../components/common/Navbar';
import Hero from '../components/landing/Hero';

// Lazy load sections below the fold
const Platforms = lazy(() => import('../components/landing/Platforms'));
const Features = lazy(() => import('../components/landing/Features'));
const Footer = lazy(() => import('../components/landing/Footer'));

const Landing = () => {
    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-white transition-colors duration-300">
            <Navbar />

            <main className="flex-1">
                <Hero />

                <Suspense fallback={<div className="h-64 flex items-center justify-center opacity-50">Cargando secciones...</div>}>
                    <Platforms />
                    <Features />
                </Suspense>
            </main>

            <Suspense fallback={null}>
                <Footer />
            </Suspense>
        </div>
    );
};

export default Landing;
