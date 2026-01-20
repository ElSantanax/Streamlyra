import React, { lazy, Suspense } from 'react';
import Header from '../components/connection/Header';
import PlatformInput from '../components/connection/PlatformInput';
import PlatformButton from '../components/connection/PlatformButton';
import { FaTwitch, FaYoutube, FaTiktok, FaArrowRight } from 'react-icons/fa';
import { SiKick } from 'react-icons/si';

const BackgroundDecorations = lazy(() => import('../components/common/BackgroundDecorations'));

const PlatformConnection: React.FC = () => {
    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display min-h-screen flex flex-col antialiased selection:bg-primary selection:text-white overflow-x-hidden">
            <Header />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col justify-center items-center p-4 relative">
                <Suspense fallback={null}>
                    <BackgroundDecorations />
                </Suspense>

                {/* Centered Card */}
                <div className="relative z-10 w-full max-w-lg bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 shadow-2xl rounded-3xl overflow-hidden">
                    {/* Card Header */}
                    <div className="px-8 pt-10 pb-4 text-center">
                        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">Conectar Plataformas</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed max-w-sm mx-auto">
                            Vincula tus cuentas de streaming para sincronizar transmisiones en vivo y alertas instantáneas.
                        </p>
                    </div>

                    {/* Content Container */}
                    <div className="p-8 flex flex-col gap-6">
                        {/* Platforms Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <PlatformButton
                                label="Twitch"
                                Icon={FaTwitch}
                                iconColor="#9146FF"
                                onClick={() => console.log('Twitch login')}
                            />

                            <PlatformButton
                                label="YouTube"
                                Icon={FaYoutube}
                                iconColor="#FF0000"
                                onClick={() => console.log('YouTube login')}
                            />

                            <PlatformButton
                                label="Kick"
                                Icon={SiKick}
                                iconColor="#53FC18"
                                onClick={() => console.log('Kick login')}
                            />

                            <PlatformInput
                                id="tiktok_handle"
                                label="TikTok"
                                Icon={FaTiktok}
                                iconColor="#FE2C55"
                                placeholder="@username"
                            />
                        </div>

                        {/* Divider */}
                        <div className="relative">
                            <div aria-hidden="true" className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-100 dark:border-gray-800/50"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-white dark:bg-card-dark px-4 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Configuración Rápida</span>
                            </div>
                        </div>

                        {/* Action Area */}
                        <div className="flex flex-col gap-4">
                            <button className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-6 rounded-2xl transition-colors duration-300 flex items-center justify-center gap-3 cursor-pointer group">
                                <span className="text-base">Ir al Panel de Control</span>
                                <FaArrowRight className="text-sm transition-transform duration-300 group-hover:translate-x-1" />
                            </button>

                            {/* Footer Links */}
                            <div className="flex justify-center px-1">
                                <a className="text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors text-sm font-semibold" href="#">Omitir por ahora</a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Help */}
                <div className="mt-8 text-center relative z-10">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                        ¿Necesitas ayuda? <a className="text-primary hover:underline font-semibold" href="#">Lee la guía de configuración</a>
                    </p>
                </div>
            </main>
        </div>
    );
};

export default PlatformConnection;
