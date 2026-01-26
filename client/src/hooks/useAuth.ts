/**
 * Hook para manejo de autenticación
 * Encapsula toda la lógica de auth del usuario
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types';

export const useAuth = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr) as User;
      } catch (e) {
        console.error('Error parsing user data', e);
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });

  const isAuthenticated = !!token && !!user;

  const login = (authToken: string, userData: User) => {
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    navigate('/');
  };

  const requireAuth = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return false;
    }
    return true;
  };

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    requireAuth,
  };
};
