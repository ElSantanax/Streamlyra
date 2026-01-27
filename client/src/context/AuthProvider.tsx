import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { authService as apiAuthService } from '../api/services/auth.service';
import { authService } from '../services/AuthService';
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

const publicAuthRoutes = new Set(['/login', '/register', '/auth/callback']);
const protectedPrefixes = ['/dashboard', '/connect'];

const isProtectedRoutePath = (path: string) => {
  return protectedPrefixes.some((p) => path === p || path.startsWith(`${p}/`));
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser, removeUser] = useLocalStorage<User | null>('user', null);

  const [status, setStatus] = useState<AuthStatus>(() => {
    if (user) return 'authenticated';
    if (isProtectedRoutePath(window.location.pathname)) return 'unknown';
    return 'unauthenticated';
  });

  const [isChecking, setIsChecking] = useState(false);
  const inFlightAuthCheck = useRef<Promise<User | null> | null>(null);
  const lastBootstrapPathRef = useRef<string | null>(null);

  const isAuthenticated = status === 'authenticated';

  const login = useCallback(
    (userData: User) => {
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
        const response = await apiAuthService.getMe();
        setUser(response.user);
        setStatus('authenticated');
        return response.user;
      } catch {
        authService.clearLocalSession();
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
      await apiAuthService.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      authService.clearLocalSession();
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
    authService.setSessionExpiredHandler((currentPath) => {
      removeUser();
      setStatus('unauthenticated');
      navigate(`/login?redirect=${encodeURIComponent(currentPath)}`, { replace: true });
    });

    return () => {
      authService.setSessionExpiredHandler(null);
    };
  }, [navigate, removeUser]);

  useEffect(() => {
    const path = location.pathname;
    if (publicAuthRoutes.has(path)) return;

    const isProtectedRoute = isProtectedRoutePath(path);

    if (user) {
      if (status === 'unauthenticated') setStatus('authenticated');
      return;
    }

    if (!isProtectedRoute) {
      if (status !== 'unauthenticated') setStatus('unauthenticated');
      lastBootstrapPathRef.current = null;
      return;
    }

    if (status === 'authenticated') return;

    if (lastBootstrapPathRef.current === path) {
      return;
    }
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

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return ctx;
};
