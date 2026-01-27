/**
 * Hook para manejo de autenticación
 * Encapsula toda la lógica de auth del usuario
 */

import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from './useLocalStorage';
import type { User } from '../types';

export const useAuth = () => {
  const navigate = useNavigate();
  const [user, setUser, removeUser] = useLocalStorage<User | null>('user', null);
  const [token, setToken, removeToken] = useLocalStorage<string | null>('token', null);

  const isAuthenticated = !!token && !!user;

  const login = (authToken: string, userData: User) => {
    setToken(authToken);
    setUser(userData);
  };

  const logout = () => {
    removeToken();
    removeUser();
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
