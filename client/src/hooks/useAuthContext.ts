import { createContext, useContext } from 'react';
import type { User } from '../types';

export type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
    user: User | null;
    status: AuthStatus;
    isChecking: boolean;
    isAuthenticated: boolean;
    login: (userData: User) => void;
    logout: () => Promise<void>;
    checkAuth: () => Promise<User | null>;
    requireAuth: () => boolean;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuthContext = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuthContext debe usarse dentro de <AuthProvider>.');
    }
    return ctx;
};
