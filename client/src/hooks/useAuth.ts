import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from './useLocalStorage';
import { authService as apiAuthService } from '../api/services/auth.service';
import { authService } from '../services/AuthService';
import type { User } from '../types';

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
    setIsChecking(true);
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
    }
  };

  useEffect(() => {
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
