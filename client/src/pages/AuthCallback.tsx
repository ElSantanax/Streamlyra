import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService as apiAuthService } from '../api/services/auth.service';
import Spinner from '../components/common/Spinner';
import { useAuth } from '../hooks/useAuth';

const AuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const calledRef = useRef(false);
    const { login } = useAuth();

    useEffect(() => {
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const state = searchParams.get('state') || 'twitch';

        if (calledRef.current) return;
        calledRef.current = true;

        if (error) {
            console.error('Error de autenticación:', error);
            navigate('/login');
            return;
        }

        if (code) {
            const authenticate = async () => {
                try {
                    let platform: 'twitch' | 'youtube' | 'kick' = 'twitch';
                    if (state.startsWith('youtube')) platform = 'youtube';
                    else if (state.startsWith('kick')) platform = 'kick';

                    let codeVerifier: string | undefined;
                    if (platform === 'kick') {
                        codeVerifier = localStorage.getItem('kick_verifier') || undefined;
                        localStorage.removeItem('kick_verifier');
                    }

                    const data = await apiAuthService.exchangeCode(platform, code, codeVerifier);

                    login(data.user);

                    // Redirigir
                    const redirectUrl = localStorage.getItem('auth_redirect');
                    localStorage.removeItem('auth_redirect');
                    navigate(redirectUrl || '/dashboard');

                } catch (err: unknown) {
                    console.error('Fallo al completar el login:', err);
                    const errorMessage = err instanceof Error ? err.message : 'Error en la autenticación';

                    if (errorMessage.includes('not encontrado') || errorMessage.includes('no encontrado')) {
                        localStorage.removeItem('user');
                        navigate('/login');
                        return;
                    }

                    alert(errorMessage);
                    navigate('/login');
                }
            };

            authenticate();
        } else {
            navigate('/login');
        }
    }, [searchParams, navigate]);

    const state = searchParams.get('state') || 'twitch';
    const platformName = state.startsWith('youtube') ? 'YouTube'
        : state.startsWith('kick') ? 'Kick'
            : 'Twitch';

    return (
        <div className="h-screen bg-background-dark flex flex-col items-center justify-center p-4">
            <Spinner size="lg" />
            <p className="mt-6 text-xl text-slate-300 animate-pulse font-medium">
                Conectando con {platformName}...
            </p>
            <p className="mt-2 text-sm text-slate-500">
                Estamos verificando tus credenciales en {platformName}
            </p>
        </div>
    );
};

export default AuthCallback;
