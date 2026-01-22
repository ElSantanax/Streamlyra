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
            const endpoint = state === 'youtube' ? '/api/auth/youtube' : '/api/auth/twitch';

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

                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ code }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || 'Error en la autenticación con el servidor');
                    }

                    const data: AuthResponse = await response.json();

                    // Guardar sesión (token y user) en localStorage
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));

                    // Éxito: Ir al dashboard
                    navigate('/dashboard');

                } catch (err: unknown) {
                    console.error('Fallo al completar el login:', err);
                    const errorMessage = err instanceof Error ? err.message : 'Error en la autenticación';
                    alert(errorMessage);
                    navigate('/dashboard'); // Volver al dashboard en vez de login si ya estaba ahí
                }
            };

            authenticate();
        } else {
            navigate('/login');
        }
    }, [searchParams, navigate]);

    return (
        <div className="h-screen bg-background-dark flex flex-col items-center justify-center p-4">
            <Spinner size="lg" />
            <p className="mt-6 text-xl text-slate-300 animate-pulse font-medium">
                Conectando con Twitch...
            </p>
            <p className="mt-2 text-sm text-slate-500">
                Estamos verificando tus credenciales
            </p>
        </div>
    );
};

export default AuthCallback;
