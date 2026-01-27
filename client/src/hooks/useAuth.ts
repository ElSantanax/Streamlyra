import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from './useLocalStorage';
import { authService as apiAuthService } from '../api/services/auth.service';
import { authService } from '../services/AuthService';
import type { User } from '../types';

let hasBootstrappedAuth = false;
let inFlightAuthCheck: Promise<User | null> | null = null;

export const useAuth = () => {
  const navigate = useNavigate();
  const [user, setUser, removeUser] = useLocalStorage<User | null>('user', null);
  const [isChecking, setIsChecking] = useState(false);

  const isAuthenticated = !!user;

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await apiAuthService.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      authService.clearLocalSession();
      removeUser();
      navigate('/');
    }
  };

  const checkAuth = async () => {
    if (inFlightAuthCheck) return inFlightAuthCheck;

    setIsChecking(true);
    inFlightAuthCheck = (async () => {
      try {
        const response = await apiAuthService.getMe();
        setUser(response.user);
        return response.user;
      } catch {
        authService.clearLocalSession();
        removeUser();
        return null;
      } finally {
        setIsChecking(false);
        inFlightAuthCheck = null;
      }
    })();

    return inFlightAuthCheck;
  };

  useEffect(() => {
    const path = window.location.pathname;
    const isPublicAuthRoute = path === '/login' || path === '/register' || path === '/auth/callback';
    if (isPublicAuthRoute) return;

    const protectedPrefixes = ['/dashboard', '/connect'];
    const isProtectedRoute = protectedPrefixes.some((p) => path === p || path.startsWith(`${p}/`));

    // Si no hay indicios de sesión y no estamos entrando a una ruta protegida,
    // no hacemos bootstrap para evitar 401 innecesarios en consola.
    if (!user && !isProtectedRoute) return;

    if (hasBootstrappedAuth) return;
    hasBootstrappedAuth = true;

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requireAuth = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return false;
    }
    return true;
  };

  return {
    user,
    isAuthenticated,
    isChecking,
    login,
    logout,
    requireAuth,
    checkAuth,
  };
};
