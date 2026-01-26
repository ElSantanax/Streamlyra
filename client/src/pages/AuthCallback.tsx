import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Spinner from '../components/common/Spinner';

interface AuthResponse {
    token: string;
    user: {
        id: string;
        username: string;
        displayName: string;
        avatar: string;
    };
}

interface ErrorResponse {
    error: string;
}

const AuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const calledRef = useRef(false); // Para evitar llamadas dobles en React.StrictMode

    useEffect(() => {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        // Evitar doble ejecución
        if (calledRef.current) return;
        calledRef.current = true;

        if (error) {
            console.error('Error de autenticación:', error);
            navigate('/login');
            return;
        }

        if (code) {
            // Verificar state para saber provider, fallback a twitch si no hay state (retrocompatibilidad)
            const state = searchParams.get('state') || 'twitch';
            let endpoint = '/api/auth/twitch';
            
            // Detectar plataforma del state (puede incluir timestamp: youtube_123456)
            if (state.startsWith('youtube')) endpoint = '/api/auth/youtube';
            else if (state.startsWith('kick')) endpoint = '/api/auth/kick';
            else if (state.startsWith('twitch')) endpoint = '/api/auth/twitch';

            // Intercambiar código por token con NUESTRO backend
            const authenticate = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const headers: Record<string, string> = {
                        'Content-Type': 'application/json',
                    };

                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }

                    const body: Record<string, string> = { code };
                    if (state === 'kick') {
                        const verifier = localStorage.getItem('kick_verifier');
                        if (verifier) {
                            body.code_verifier = verifier;
                            localStorage.removeItem('kick_verifier'); // Limpiar después de usar
                        }
                    }

                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(body),
                    });

                    if (!response.ok) {
                        const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
                        throw new Error(errorData.error || 'Error en la autenticación con el servidor');
                    }

                    const data = (await response.json()) as AuthResponse;

                    // Guardar sesión (token y user) en localStorage
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));

                    // Éxito: Ir al dashboard
                    navigate('/dashboard');

                } catch (err: unknown) {
                    console.error('Fallo al completar el login:', err);
                    const errorMessage = err instanceof Error ? err.message : 'Error en la autenticación';

                    // Si el error es que el usuario no existe, limpiamos todo y volvemos a login
                    if (errorMessage.includes('not encontrado') || errorMessage.includes('no encontrado')) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        navigate('/login');
                        return;
                    }

                    // Si Twitch nos da un 400 (ej: code ya usado)
                    if (errorMessage.includes('status code 400')) {
                        alert('El código de Twitch ha expirado o ya fue usado. Por favor, intenta conectar de nuevo.');
                        localStorage.removeItem('token');
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
