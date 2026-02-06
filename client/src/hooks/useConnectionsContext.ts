import { useContext, createContext } from 'react';
import type { ConnectionsContextValue } from '../context/ConnectionsProvider';

export const ConnectionsContext = createContext<ConnectionsContextValue | undefined>(undefined);

export const useConnectionsContext = () => {
    const ctx = useContext(ConnectionsContext);
    if (!ctx) {
        throw new Error('useConnections debe usarse dentro de <ConnectionsProvider>.');
    }
    return ctx;
};
