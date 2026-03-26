import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { authService } from '../services/api/auth.service';
import { sessionManager } from '../services/session';
import { socket } from '../services/socket';
import { isProtectedRoute, isPublicAuthRoute } from '../config/routes';
import { AuthContext, type AuthStatus, type AuthContextValue } from '../hooks/useAuthContext';
import type { User } from '../types';

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
  const isLoggingOut = useRef(false);
  const hasCheckedAuthRef = useRef(false);

  const isAuthenticated = status === 'authenticated';

  const login = useCallback(
    (userData: User) => {
      const safeUser = { ...userData as unknown as Record<string, unknown> };
      delete safeUser.token;
      setUser(safeUser as unknown as User);
      setStatus('authenticated');
    },
    [setUser]
  );

  const checkAuth = useCallback(async () => {
    if (inFlightAuthCheck.current || isLoggingOut.current) return inFlightAuthCheck.current;

    setIsChecking(true);

    inFlightAuthCheck.current = (async () => {
      try {
        const response = await authService.getMe();
        if (isLoggingOut.current) return null;
        setUser(response.user);
        setStatus('authenticated');
        return response.user;
      } catch {
        if (!isLoggingOut.current) {
          sessionManager.clearLocalSession();
          removeUser();
          setStatus('unauthenticated');
        }
        return null;
      } finally {
        setIsChecking(false);
        inFlightAuthCheck.current = null;
      }
    })();

    return inFlightAuthCheck.current;
  }, [removeUser, setUser]);

  const logout = useCallback(async () => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    try {
      if (socket.connected) {
        socket.emit('logout');
      }

      sessionManager.clearLocalSession();
      removeUser();
      setStatus('unauthenticated');
      navigate('/', { replace: true });

      void authService.logout().catch(() => { });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error during logout';
      console.error('Error during logout:', errorMessage);
    } finally {
      setTimeout(() => {
        isLoggingOut.current = false;
      }, 500);
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
    const isProtected = isProtectedRoute(path);
    const isPublicAuth = isPublicAuthRoute(path);

    if (!isProtected && !isPublicAuth) {
      if (user && status !== 'authenticated') {
        setStatus('authenticated');
      } else if (!user && status !== 'unauthenticated') {
        setStatus('unauthenticated');
      }
      return;
    }

    if (hasCheckedAuthRef.current) return;
    hasCheckedAuthRef.current = true;

    if (!user && status !== 'unknown') {
      setStatus('unknown');
    }

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
  }, [
    checkAuth,
    isAuthenticated,
    isChecking,
    login,
    logout,
    requireAuth,
    status,
    user,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
