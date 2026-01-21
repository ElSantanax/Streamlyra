import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import PlatformButton from '../components/connection/PlatformButton';
import { FaTwitch, FaQuestionCircle } from 'react-icons/fa';

const BackgroundDecorations = lazy(() => import('../components/common/BackgroundDecorations'));

const PlatformConnection = () => {
    const navigate = useNavigate();

    return (
        <div className="page-base antialiased selection:bg-primary selection:text-white overflow-x-hidden">
            <Navbar />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col justify-center items-center p-4 relative">
                <Suspense fallback={null}>
                    <BackgroundDecorations />
                </Suspense>

                {/* Centered Card */}
                <div className="relative z-10 w-full max-w-lg bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-800 shadow-2xl rounded-3xl overflow-hidden">
                    {/* Card Header */}
                    <div className="px-8 pt-16 pb-6 text-center flex flex-col items-center">
                        <h1 className="text-3xl md:text-4xl font-brand text-primary mb-6 tracking-widest uppercase">
                            Streamlyra
                        </h1>

                        <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-200 mb-2">
                            Conecta tu comunidad
                        </h2>
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
                                onClick={() => navigate('/dashboard')}
                                className="w-full transition-colors duration-300"
                            />
                        </div>

                        <div className="text-center">
                            <p className="text-slate-400 dark:text-slate-500 text-sm leading-relaxed">
                                Tu cuenta de Twitch será tu identidad en Streamlyra. Podrás agregar YouTube, Kick y TikTok después.
                            </p>
                        </div>


                    </div>
                </div>

                {/* Bottom Help */}
                <div className="mt-8 text-center relative z-10">
                    <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
                        <span>¿Necesitas ayuda? <a className="text-primary hover:underline font-bold" href="#">Lee la guía</a></span>
                        <FaQuestionCircle className="text-primary" />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PlatformConnection;
