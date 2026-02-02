/**
 * Configuración de rutas de la aplicación
 */

/**
 * Rutas públicas relacionadas con autenticación
 * Estas rutas no requieren verificación de sesión
 */
export const publicAuthRoutes = new Set(['/login', '/register', '/auth/callback']);

/**
 * Prefijos de rutas protegidas
 * Cualquier ruta que comience con estos prefijos requiere autenticación
 */
export const protectedPrefixes = ['/dashboard', '/connect'];

/**
 * Determina si una ruta es protegida
 */
export const isProtectedRoute = (path: string): boolean => {
  return protectedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
};

/**
 * Determina si una ruta es pública de autenticación
 */
export const isPublicAuthRoute = (path: string): boolean => {
  return publicAuthRoutes.has(path);
};
