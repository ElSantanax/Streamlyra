import { useAuthContext } from '../context/AuthProvider';

export const useAuth = () => {
  return useAuthContext();
};
