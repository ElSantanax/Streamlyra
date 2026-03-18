import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService as apiAuthService } from '../services/api/auth.service';
import Spinner from '../components/common/Spinner';
import { useAuth } from '../hooks/useAuth';
import { toast } from '../lib/notifications';
import { invalidateConnectionsCache } from '../hooks/useConnections';
import { useConnectionsStore } from '../store/useConnectionsStore';
import { useTranslation } from 'react-i18next';

const AuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const calledRef = useRef(false);
    const { login } = useAuth();
    const { t } = useTranslation();

    useEffect(() => {
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const state = searchParams.get('state') || 'twitch';

        if (calledRef.current) return;
        calledRef.current = true;

        if (error) {
            console.error('Error de autenticación:', error);

            // Limpiar datos temporales de Kick si existen
            if (state.startsWith('kick')) {
                localStorage.removeItem('kick_verifier');
            }

            const isCancel = error === 'access_denied' || error === 'user_cancelled';
            const message = isCancel
                ? 'Conexión cancelada por el usuario'
                : `Error de autenticación: ${error}`;

            toast.error(message);

            // Si ya tiene sesión (está vinculando), volver al origen en lugar de login
            const hasSession = localStorage.getItem('user') !== null;
            const redirectUrl = localStorage.getItem('auth_redirect');
            localStorage.removeItem('auth_redirect');

            if (hasSession) {
                navigate(redirectUrl || '/dashboard');
            } else {
                navigate('/login');
            }
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

                        // Validar que el codeVerifier existe antes de intentar el intercambio
                        if (!codeVerifier) {
                            console.error('Falta code_verifier para Kick. Posible pérdida de sesión local.');
                            toast.error('La sesión de autenticación expiró. Por favor, intenta conectar nuevamente.');

                            // Redirigir de vuelta para intentar de nuevo
                            const redirectUrl = localStorage.getItem('auth_redirect');
                            navigate(redirectUrl || '/dashboard');
                            return;
                        }
                    }

                    const data = await apiAuthService.exchangeCode(platform, code, codeVerifier);


                    login(data.user);
                    invalidateConnectionsCache();

                    await useConnectionsStore.getState().fetchConnections(true);

                    // Redirigir
                    const redirectUrl = localStorage.getItem('auth_redirect');
                    localStorage.removeItem('auth_redirect');
                    navigate(redirectUrl || '/dashboard');

                } catch (err: unknown) {
                    console.error('Fallo al completar el login:', err);
                    const errorMessage = err instanceof Error ? err.message : 'Error en la autenticación';

                    // Manejar caso de usuario no encontrado
                    if (errorMessage.includes('not encontrado') || errorMessage.includes('no encontrado')) {
                        localStorage.removeItem('user');
                        toast.error('Usuario no encontrado. Por favor, intenta conectar nuevamente.');
                        navigate('/login');
                        return;
                    }

                    // Manejar caso de cuota de YouTube agotada (ya no debería ocurrir, pero por si acaso)
                    if (errorMessage.includes('cuota') && errorMessage.includes('YouTube')) {
                        toast.warning('La cuota de YouTube está temporalmente agotada, pero tu cuenta se conectó exitosamente. Algunas funciones estarán limitadas hasta mañana.');
                        // Aún así redirigir al dashboard si el login fue exitoso
                        const redirectUrl = localStorage.getItem('auth_redirect');
                        localStorage.removeItem('auth_redirect');
                        navigate(redirectUrl || '/dashboard');
                        return;
                    }

                    // Error genérico
                    toast.error(`Error al conectar: ${errorMessage}`);

                    // Si ya tengo sesión (estoy vinculando), volver al dashboard/origen en lugar de login
                    const hasSession = localStorage.getItem('user') !== null;
                    const redirectUrl = localStorage.getItem('auth_redirect');
                    localStorage.removeItem('auth_redirect');

                    if (hasSession) {
                        navigate(redirectUrl || '/dashboard');
                    } else {
                        navigate('/login');
                    }
                }
            };

            authenticate();
        } else {
            // Si no hay código ni error, y el usuario ya tiene sesión, mandarlo al dashboard
            const hasSession = localStorage.getItem('user') !== null;
            if (hasSession) {
                navigate('/dashboard');
            } else {
                navigate('/login');
            }
        }
    }, [searchParams, navigate, login]);

    const state = searchParams.get('state') || 'twitch';
    const platformName = state.startsWith('youtube') ? 'YouTube'
        : state.startsWith('kick') ? 'Kick'
            : 'Twitch';

    return (
        <div className="h-screen bg-background-dark flex flex-col items-center justify-center p-4">
            <Spinner size="lg" />
            <p className="mt-6 text-xl text-slate-300 animate-pulse font-medium">
                {t('dashboard.authCallback.connecting', { platform: platformName })}
            </p>
            <p className="mt-2 text-sm text-slate-500">
                {t('dashboard.authCallback.verifying', { platform: platformName })}
            </p>
        </div>
    );
};

export default AuthCallback;
