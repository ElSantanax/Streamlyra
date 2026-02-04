import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { authService } from '../services/api/auth.service';
import { sessionManager } from '../services/session';
import { isProtectedRoute, isPublicAuthRoute } from '../config/routes';
import { useConnections } from '../hooks/useConnections';
import type { User } from '../types';
import type { ConnectionInfo } from '../types';
import type { PlatformKey } from '../constants/platforms';

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
  // Connections
  connections: Record<string, ConnectionInfo>;
  updateConnection: (platform: string, updates: Partial<ConnectionInfo>) => void;
  disconnectPlatform: (platform: PlatformKey) => Promise<void>;
  refetchConnections: () => Promise<void>;
  searchStream: (platform: PlatformKey) => void;
  isLoadingConnections: boolean;
  connectionsError: string | null;
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

  // Mover useConnections aquí para que persista entre navegaciones
  const {
    connections,
    updateConnection,
    disconnectPlatform,
    refetch: refetchConnections,
    searchStream,
    isLoading: isLoadingConnections,
    error: connectionsError
  } = useConnections(isAuthenticated);

  const login = useCallback(
    (userData: User) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { token: _token, ...safeUser } = userData as unknown as Record<string, unknown>;
      setUser(safeUser as unknown as User);
      setStatus('authenticated');
      // Refetch connections después de login para obtener las nuevas conexiones
      setTimeout(() => {
        void refetchConnections();
      }, 100);
    },
    [setUser, refetchConnections]
  );

  // Refetch connections cuando el user cambia (nueva conexión agregada)
  useEffect(() => {
    if (user && isAuthenticated) {
      refetchConnections();
    }
  }, [user, isAuthenticated, refetchConnections]); // Solo cuando cambia el ID del usuario u otras dependencias vitales

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
      // Connections
      connections,
      updateConnection,
      disconnectPlatform,
      refetchConnections,
      searchStream,
      isLoadingConnections,
      connectionsError,
    };
  }, [
    checkAuth,
    isAuthenticated,
    isChecking,
    login,
    logout,
    requireAuth,
    status,
    user,
    connections,
    updateConnection,
    disconnectPlatform,
    refetchConnections,
    searchStream,
    isLoadingConnections,
    connectionsError,
  ]);

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