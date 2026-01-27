# Plan de Implementación: Robustez y Seguridad del Cliente

## Resumen

Este plan implementa tres mejoras críticas de seguridad y robustez para Streamlyra Client:

1. Sistema de Error Boundaries (global y local)
2. Sistema de Rutas Protegidas con ProtectedRoute
3. Migración de autenticación a HttpOnly Cookies

La implementación sigue un orden que minimiza riesgos: primero Error Boundaries (sin breaking changes), luego ProtectedRoute (mejora de seguridad), y finalmente HttpOnly Cookies (requiere coordinación con backend).

## Tareas

- [x] 1. Configurar infraestructura de testing
  - Instalar fast-check para property-based testing
  - Configurar generadores personalizados para User, URLs, estados de auth
  - Crear utilidades de testing compartidas
  - _Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 2. Implementar sistema de Error Boundaries
  - [x] 2.1 Crear GlobalErrorBoundary component
    - Implementar class component con getDerivedStateFromError y componentDidCatch
    - Añadir logging estructurado con timestamp y contexto
    - Implementar lógica de logging condicional (dev vs prod)
    - _Requisitos: 2.1, 2.2, 2.5, 6.1, 6.2, 6.5_
  - [x] 2.2 Escribir test de propiedad para captura de errores
    - **Propiedad 6: Captura de errores de componentes**
    - **Valida: Requisitos 2.2**
  - [x] 2.3 Crear GlobalErrorFallback component
    - Implementar UI alternativa con mensaje amigable
    - Añadir botón de "Intentar de nuevo" con funcionalidad de reset
    - Incluir detalles técnicos solo en desarrollo (dentro de details)
    - Aplicar estilos consistentes con el sistema de diseño
    - _Requisitos: 2.3, 2.4, 7.1, 7.2, 7.3, 7.6_
  - [x] 2.4 Escribir tests de propiedad para UI alternativa
    - **Propiedad 7: Renderizado de UI alternativa al capturar error**
    - **Propiedad 8: UI alternativa contiene botón de recarga**
    - **Propiedad 22: Mensajes de error amigables sin detalles técnicos**
    - **Valida: Requisitos 2.3, 2.4, 7.1, 7.2**
  - [x] 2.5 Crear LocalErrorBoundary component
    - Implementar class component similar a GlobalErrorBoundary
    - Crear UI alternativa compacta para errores locales
    - Implementar logging con contexto de sección
    - _Requisitos: 2.6, 2.7_
  - [x] 2.6 Escribir test de propiedad para aislamiento de errores
    - **Propiedad 10: Aislamiento de errores locales**
    - **Propiedad 11: Preservación de estado fuera del árbol fallido**
    - **Valida: Requisitos 2.7, 2.8**
  - [x] 2.7 Integrar GlobalErrorBoundary en main.tsx
    - Envolver App component con GlobalErrorBoundary
    - Verificar que no rompe lazy loading existente
    - _Requisitos: 2.1_
  - [x] 2.8 Escribir tests unitarios para funcionalidad de reset
    - **Propiedad 23: Funcionalidad de recuperación de errores**
    - **Valida: Requisitos 7.4**

- [x] 3. Checkpoint - Verificar Error Boundaries
  - Asegurar que todos los tests de Error Boundaries pasan
  - Verificar que errores de componentes se capturan correctamente
  - Confirmar que UI alternativa se muestra apropiadamente
  - Preguntar al usuario si hay dudas o ajustes necesarios

- [-] 4. Implementar sistema de rutas protegidas
  - [x] 4.1 Crear ProtectedRoute component
    - Implementar componente que verifica isAuthenticated
    - Añadir lógica de redirección a /login con preservación de URL
    - Usar useLocation para capturar pathname actual
    - _Requisitos: 1.1, 1.2, 1.3_
  - [x] 4.2 Escribir tests de propiedad para ProtectedRoute
    - **Propiedad 1: Validación de autenticación antes de renderizado**
    - **Propiedad 2: Redirección de usuarios no autenticados**
    - **Propiedad 3: Preservación de URL destino en redirección**
    - **Valida: Requisitos 1.1, 1.2, 1.3**
  - [x] 4.3 Actualizar App.tsx con rutas protegidas
    - Envolver /dashboard con ProtectedRoute
    - Envolver /connect con ProtectedRoute
    - Mantener rutas públicas sin cambios (/, /login, /register, /auth/callback)
    - _Requisitos: 1.5, 1.6_
  - [x] 4.4 Escribir tests unitarios para configuración de rutas
    - Verificar que /dashboard y /connect están protegidas
    - Verificar que rutas públicas son accesibles sin auth
    - _Requisitos: 1.5, 1.6_
  - [x] 4.5 Implementar redirección post-autenticación
    - Modificar lógica de login para leer parámetro redirect
    - Redirigir a URL preservada después de autenticación exitosa
    - Manejar caso donde no hay redirect (ir a /dashboard por defecto)
    - _Requisitos: 1.4_
  - [x] 4.6 Escribir test de propiedad para redirección post-auth
    - **Propiedad 4: Redirección post-autenticación**
    - **Valida: Requisitos 1.4**
  - [x] 4.7 Implementar prevención de acceso a páginas de auth
    - Añadir lógica en /login y /register para redirigir si ya autenticado
    - Redirigir a /dashboard cuando usuario autenticado accede a estas rutas
    - _Requisitos: 1.7_
  - [x] 4.8 Escribir test de propiedad para prevención de acceso
    - **Propiedad 5: Prevención de acceso a páginas de auth cuando autenticado**
    - **Valida: Requisitos 1.7**

- [ ] 5. Integrar LocalErrorBoundary en componentes críticos
  - [x] 5.1 Añadir LocalErrorBoundary en Dashboard
    - Envolver secciones críticas (ChatFeed, ConnectionsPanel)
    - Verificar que errores se aíslan correctamente
    - _Requisitos: 2.6, 2.7_
  - [x] 5.2 Añadir LocalErrorBoundary en PlatformConnection (cuando se usa en /connect)
    - Envolver formularios y componentes de conexión
    - _Requisitos: 2.6, 2.7_
  - [x] 5.3 Escribir tests de integración para aislamiento
    - Verificar que error en una sección no afecta otras
    - Verificar que estado global se preserva
    - _Requisitos: 2.7, 2.8_

- [x] 6. Checkpoint - Verificar rutas protegidas
  - Asegurar que todos los tests de ProtectedRoute pasan
  - Verificar manualmente flujo de redirección
  - Confirmar que rutas públicas siguen accesibles
  - Preguntar al usuario si hay dudas o ajustes necesarios

- [ ] 7. Implementar migración a HttpOnly Cookies
  - [ ] 7.1 Crear AuthService
    - Implementar handleSessionExpired() con limpieza de localStorage
    - Añadir logging de eventos de sesión expirada
    - Implementar redirección a /login con preservación de URL
    - Añadir flag para prevenir múltiples limpiezas simultáneas
    - _Requisitos: 3.5, 3.6, 4.1, 4.2, 4.3, 4.5, 6.6_
  - [ ] 7.2 Escribir tests unitarios para AuthService
    - Verificar limpieza de localStorage
    - Verificar logging de eventos
    - Verificar redirección con URL preservada
    - _Requisitos: 4.2, 4.3, 6.6_
  - [ ] 7.3 Actualizar HttpClient con credentials: 'include'
    - Añadir credentials: 'include' en todas las peticiones fetch
    - Eliminar método getAuthToken() que lee de localStorage
    - Eliminar lógica de añadir Authorization header
    - _Requisitos: 3.2, 3.3_
  - [ ] 7.4 Escribir test de propiedad para credentials
    - **Propiedad 12: Inclusión de credentials en peticiones HTTP**
    - **Valida: Requisitos 3.2**
  - [ ] 7.5 Implementar interceptor 401 en HttpClient
    - Detectar respuestas 401 en método request()
    - Llamar a authService.handleSessionExpired() cuando se detecta 401
    - Implementar flag isHandling401 para prevenir múltiples limpiezas
    - Lanzar ApiError después de manejar 401
    - _Requisitos: 3.5, 4.1, 4.5_
  - [ ] 7.6 Escribir tests de propiedad para interceptor 401
    - **Propiedad 14: Limpieza de sesión en respuesta 401**
    - **Propiedad 15: Redirección a login tras 401**
    - **Propiedad 17: Idempotencia de limpieza de sesión**
    - **Propiedad 21: Logging de eventos 401**
    - **Valida: Requisitos 3.5, 3.6, 4.2, 4.3, 4.5, 6.6**
  - [ ] 7.7 Actualizar useAuth hook
    - Eliminar gestión de token (removeToken, setToken)
    - Eliminar variable token del estado
    - Actualizar isAuthenticated para basarse solo en user
    - Modificar login() para solo guardar userData (no token)
    - _Requisitos: 3.3, 3.4, 3.7_
  - [ ] 7.8 Escribir tests de propiedad para useAuth actualizado
    - **Propiedad 13: Almacenamiento de perfil sin token**
    - **Propiedad 16: Validación de autenticación basada en estado de usuario**
    - **Propiedad 18: Preservación de API pública de useAuth**
    - **Valida: Requisitos 3.4, 3.7, 5.3**
  - [ ] 7.9 Implementar checkAuth() en useAuth
    - Añadir método checkAuth() que llama a /auth/me
    - Ejecutar checkAuth() en useEffect al montar
    - Añadir estado isChecking para mostrar loading
    - Manejar errores limpiando estado residual
    - _Requisitos: 3.8_
  - [ ] 7.10 Escribir test unitario para checkAuth
    - Verificar que se llama a /auth/me al iniciar
    - Verificar que se actualiza user con respuesta exitosa
    - Verificar que se limpia user si falla
    - _Requisitos: 3.8_
  - [ ] 7.11 Implementar endpoint de logout
    - Añadir llamada a POST /auth/logout en método logout()
    - Manejar errores de logout gracefully
    - Limpiar localStorage después de llamada
    - _Requisitos: 5.1, 5.2_
  - [ ] 7.12 Escribir tests de integración para flujo de logout
    - Verificar que se llama a /auth/logout
    - Verificar que se limpia localStorage
    - Verificar redirección a /
    - _Requisitos: 5.1, 5.2_

- [ ] 8. Verificar compatibilidad hacia atrás
  - [ ] 8.1 Escribir tests de integración para flujo OAuth
    - Verificar que /auth/callback sigue funcionando
    - Verificar que callback procesa respuesta correctamente
    - _Requisitos: 5.1, 5.2_
  - [ ] 8.2 Escribir test de propiedad para estructura de datos
    - **Propiedad 19: Preservación de estructura de datos de usuario**
    - **Valida: Requisitos 5.4**
  - [ ] 8.3 Escribir tests de regresión para endpoints públicos
    - Verificar que endpoints sin auth siguen funcionando
    - _Requisitos: 5.5_

- [ ] 9. Checkpoint final - Verificar integración completa
  - Asegurar que todos los tests pasan (unitarios y de propiedad)
  - Verificar manualmente flujo completo de autenticación
  - Verificar manualmente manejo de sesión expirada
  - Verificar manualmente captura de errores
  - Confirmar que no hay regresiones en funcionalidad existente
  - Preguntar al usuario si hay dudas o ajustes necesarios

- [ ] 10. Documentación y limpieza
  - [ ] 10.1 Actualizar README con cambios de seguridad
    - Documentar nuevo flujo de autenticación con HttpOnly cookies
    - Documentar sistema de Error Boundaries
    - Documentar rutas protegidas
    - _Requisitos: N/A (documentación)_
  - [ ] 10.2 Añadir comentarios JSDoc a componentes nuevos
    - Documentar ProtectedRoute
    - Documentar GlobalErrorBoundary y LocalErrorBoundary
    - Documentar AuthService
    - _Requisitos: N/A (documentación)_
  - [ ] 10.3 Limpiar código obsoleto
    - Eliminar código comentado si existe
    - Verificar que no quedan referencias a token en localStorage
    - _Requisitos: 3.3_

## Notas

- Todas las tareas son requeridas para cobertura completa de testing
- Cada checkpoint es un momento para validar progreso y hacer ajustes
- La implementación sigue un orden que minimiza riesgos: Error Boundaries → ProtectedRoute → HttpOnly Cookies
- La migración a HttpOnly Cookies requiere coordinación con el backend (ver sección "Dependencias con Backend" en design.md)
- Los tests de propiedad usan fast-check con mínimo 100 iteraciones
- Cada test de propiedad debe incluir tag con formato: `Feature: client-security-robustness, Property N: [título]`

## Dependencias con Backend

Antes de implementar la tarea 7 (migración a HttpOnly Cookies), el backend debe tener:

1. Endpoint GET /auth/me que retorna datos de usuario basándose en cookie
2. Endpoint POST /auth/logout que limpia la cookie
3. Set-Cookie en respuestas de autenticación con flags: HttpOnly, Secure, SameSite=Strict
4. Validación de cookie en todos los endpoints protegidos
5. Retorno de 401 cuando cookie no existe o es inválida

Si el backend no está listo, las tareas 1-6 pueden implementarse independientemente.
