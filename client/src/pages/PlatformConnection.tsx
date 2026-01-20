import React, { lazy, Suspense } from 'react';
import Header from '../components/connection/Header';
import PlatformButton from '../components/connection/PlatformButton';
import { FaTwitch, FaCheckCircle, FaQuestionCircle } from 'react-icons/fa';

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
                    <div className="px-8 pt-10 pb-6 text-center flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="size-10 text-primary flex items-center justify-center">
                                <span className="material-symbols-outlined text-4xl">hub</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-widest">Streamlyra</h2>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">Bienvenido a Streamlyra</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-base font-medium leading-relaxed max-w-sm mx-auto">
                            Unifica todos tus chats de streaming en una sola pantalla
                        </p>
                    </div>

                    {/* Content Container */}
                    <div className="p-8 pt-0 flex flex-col gap-8">
                        <div className="w-full border-t border-gray-100 dark:border-gray-800/50"></div>

                        <div className="text-center">
                            <p className="text-slate-600 dark:text-slate-300 font-medium mb-6">
                                Para comenzar, conecta tu cuenta principal de Twitch:
                            </p>

                            <PlatformButton
                                label="Iniciar Sesión con Twitch"
                                Icon={FaTwitch}
                                iconColor="#9146FF"
                                onClick={() => console.log('Twitch login')}
                                className="w-full transition-colors duration-300"
                            />
                        </div>

                        <div className="text-center">
                            <p className="text-slate-400 dark:text-slate-500 text-sm leading-relaxed">
                                Tu cuenta de Twitch será tu identidad en Streamlyra. Podrás agregar YouTube, Kick y TikTok después.
                            </p>
                        </div>

                        <div className="w-full border-t border-gray-100 dark:border-gray-800/50"></div>

                        {/* Security Features */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm font-medium">
                                <FaCheckCircle className="text-green-500 shrink-0" />
                                <span>Seguro con OAuth de Twitch</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm font-medium">
                                <FaCheckCircle className="text-green-500 shrink-0" />
                                <span>No guardamos tu contraseña</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm font-medium">
                                <FaCheckCircle className="text-green-500 shrink-0" />
                                <span>Puedes desconectar cuando quieras</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Help */}
                <div className="mt-8 text-center relative z-10">
                    <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
                        <FaQuestionCircle className="text-primary" />
                        <span>¿Necesitas ayuda? <a className="text-primary hover:underline font-bold" href="#">Lee la guía</a></span>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PlatformConnection;
