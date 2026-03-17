import { useConnections } from '../hooks/useConnections';
import { useAuth } from '../hooks/useAuth';

/**
 * ConnectionsProvider (ahora ConnectionsManager)
 * Se encarga de inicializar la lógica de conexiones y sockets al montar la aplicación.
 * El estado ahora reside en Zustand, por lo que ya no actúa como Provider de Context.
 */
export const ConnectionsProvider = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();

    // Inicializa el fetching y los listeners de Socket (Zustand)
    useConnections(isAuthenticated);

    return <>{children}</>;
};



