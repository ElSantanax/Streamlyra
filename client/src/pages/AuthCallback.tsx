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
            // Intercambiar código por token con NUESTRO backend
            const authenticate = async () => {
                try {
                    const response = await fetch('/api/auth/twitch', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ code }),
                    });

                    if (!response.ok) {
                        throw new Error('Error en la autenticación con el servidor');
                    }

                    const data: AuthResponse = await response.json();

                    // Guardar sesión (token y user) en localStorage
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));

                    // Éxito: Ir al dashboard
                    navigate('/dashboard');

                } catch (err) {
                    console.error('Fallo al completar el login:', err);
                    navigate('/login');
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
