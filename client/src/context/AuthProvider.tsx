import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { authService } from '../api/services/auth.service';
import { sessionManager } from '../services/SessionManager';
import { isProtectedRoute, isPublicAuthRoute } from '../config/routes';
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

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const getInitialAuthStatus = (user: User | null, currentPath: string): AuthStatus => {
  if (user) return 'authenticated';
  if (isProtectedRoute(currentPath)) return 'unknown';
  return 'unauthenticated';
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser, removeUser] = useLocalStorage<User | null>('user', null);

  const [status, setStatus] = useState<AuthStatus>(() =>
    getInitialAuthStatus(user, window.location.pathname)
  );

  const [isChecking, setIsChecking] = useState(false);
  const inFlightAuthCheck = useRef<Promise<User | null> | null>(null);
  const lastBootstrapPathRef = useRef<string | null>(null);

  const isAuthenticated = status === 'authenticated';

  const login = useCallback(
    (userData: User) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { token: _token, ...safeUser } = userData as unknown as Record<string, unknown>;
      setUser(safeUser as unknown as User);
      setStatus('authenticated');
    },
    [setUser]
  );

  const checkAuth = useCallback(async () => {
    if (inFlightAuthCheck.current) return inFlightAuthCheck.current;

    setIsChecking(true);

    inFlightAuthCheck.current = (async () => {
      try {
        const response = await authService.getMe();
        setUser(response.user);
        setStatus('authenticated');
        return response.user;
      } catch {
        sessionManager.clearLocalSession();
        removeUser();
        setStatus('unauthenticated');
        return null;
      } finally {
        setIsChecking(false);
        inFlightAuthCheck.current = null;
      }
    })();

    return inFlightAuthCheck.current;
  }, [removeUser, setUser]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      sessionManager.clearLocalSession();
      removeUser();
      setStatus('unauthenticated');
      navigate('/');
    }
  }, [navigate, removeUser]);

  const requireAuth = useCallback(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return false;
    }
    return true;
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    sessionManager.setSessionExpiredHandler((currentPath: string) => {
      removeUser();
      setStatus('unauthenticated');
      navigate(`/login?redirect=${encodeURIComponent(currentPath)}`, { replace: true });
    });

    return () => {
      sessionManager.setSessionExpiredHandler(null);
    };
  }, [navigate, removeUser]);

  useEffect(() => {
    const path = location.pathname;

    if (isPublicAuthRoute(path)) return;

    const isProtected = isProtectedRoute(path);

    if (user) {
      if (status === 'unauthenticated') setStatus('authenticated');
      return;
    }

    if (!isProtected) {
      if (status !== 'unauthenticated') setStatus('unauthenticated');
      lastBootstrapPathRef.current = null;
      return;
    }

    if (status === 'authenticated') return;

    if (lastBootstrapPathRef.current === path) return;
    lastBootstrapPathRef.current = path;

    if (status !== 'unknown') setStatus('unknown');
    void checkAuth();
  }, [checkAuth, location.pathname, status, user]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      status,
      isChecking,
      isAuthenticated,
      login,
      logout,
      requireAuth,
      checkAuth,
    };
  }, [checkAuth, isAuthenticated, isChecking, login, logout, requireAuth, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return ctx;
};