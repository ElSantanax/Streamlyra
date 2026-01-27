/**
 * ProtectedRoute
 * Componente que valida autenticación antes de renderizar rutas protegidas
 * Redirige a login si el usuario no está autenticado, preservando la URL destino
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Spinner from './Spinner';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { status, isAuthenticated } = useAuth();
  const location = useLocation();

  if (status === 'unknown') {
    return <Spinner fullScreen text="Verificando sesión..." size="lg" />;
  }

  if (!isAuthenticated) {
    // Preservar URL destino para redirección post-login
    const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(location.pathname)}`;
    return <Navigate to={redirectUrl} replace />;
  }

  return <>{children}</>;
}
