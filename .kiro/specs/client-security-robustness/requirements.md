# Documento de Requisitos

## Introducción

Streamlyra es una aplicación React + TypeScript que agrega chats de múltiples plataformas de streaming (Twitch, YouTube, TikTok, Kick). Actualmente, el cliente presenta vulnerabilidades críticas de seguridad y problemas de robustez que comprometen la experiencia del usuario y la protección de datos sensibles.

Esta especificación define los requisitos para la Fase 1 del roadmap técnico: "Robustez y Seguridad". El objetivo es implementar tres mejoras fundamentales: protección de rutas mediante autenticación, aislamiento de errores mediante Error Boundaries, y migración de tokens JWT desde localStorage a HttpOnly Cookies para prevenir ataques XSS.

## Glosario

- **Componente_Ruta_Protegida**: Componente de React que valida la autenticación del usuario antes de renderizar rutas protegidas
- **Barrera_Errores**: Componente de React que captura errores de JavaScript en su árbol de componentes hijos
- **Cookie_HttpOnly**: Cookie HTTP que no es accesible mediante JavaScript del cliente, solo enviada automáticamente en peticiones HTTP
- **Token_JWT**: JSON Web Token utilizado para autenticación y autorización
- **Interceptor_Auth**: Mecanismo que intercepta respuestas HTTP para manejar errores de autenticación automáticamente
- **Cliente_HTTP**: Cliente HTTP personalizado que envuelve fetch para realizar peticiones al backend
- **Hook_useAuth**: Hook personalizado de React que gestiona el estado de autenticación del usuario
- **UI_Alternativa**: Interfaz de usuario alternativa mostrada cuando ocurre un error

## Requisitos

### Requisito 1: Sistema de Rutas Protegidas

**Historia de Usuario:** Como administrador del sistema, quiero proteger las rutas autenticadas, para que usuarios no autorizados no puedan acceder a áreas sensibles de la aplicación.

#### Criterios de Aceptación

1. EL Componente_Ruta_Protegida DEBERÁ validar la autenticación del usuario antes de renderizar rutas protegidas
2. CUANDO un usuario no autenticado intenta acceder a una ruta protegida, ENTONCES EL Componente_Ruta_Protegida DEBERÁ redirigir a /login
3. CUANDO se redirija a login, EL Componente_Ruta_Protegida DEBERÁ preservar la URL de destino original
4. CUANDO un usuario se autentica exitosamente, ENTONCES EL Sistema DEBERÁ redirigir a la URL originalmente solicitada
5. EL Sistema DEBERÁ aplicar Componente_Ruta_Protegida a las rutas /dashboard y /connect
6. EL Sistema DEBERÁ mantener las rutas /, /login, /register y /auth/callback como rutas públicas
7. CUANDO un usuario autenticado intenta acceder a /login o /register, ENTONCES EL Sistema DEBERÁ redirigir a /dashboard

### Requisito 2: Sistema de Barreras de Errores

**Historia de Usuario:** Como usuario, quiero que la aplicación maneje errores de componentes de forma elegante, para que el fallo de un solo componente no colapse toda la aplicación.

#### Criterios de Aceptación

1. LA Barrera_Errores_Global DEBERÁ envolver todo el árbol de componentes de la aplicación
2. CUANDO un componente lanza un error, ENTONCES LA Barrera_Errores DEBERÁ capturarlo y prevenir el colapso de la aplicación
3. CUANDO se captura un error, ENTONCES LA Barrera_Errores DEBERÁ mostrar una UI_Alternativa con información del error
4. LA UI_Alternativa DEBERÁ proporcionar un botón para recargar el componente o página fallida
5. LA Barrera_Errores DEBERÁ registrar detalles del error en consola en entorno de desarrollo
6. EL Sistema DEBERÁ implementar componentes Barrera_Errores locales para las secciones Dashboard y Chat Feed
7. CUANDO una Barrera_Errores local captura un error, ENTONCES EL Sistema DEBERÁ aislar el fallo solo a esa sección
8. LA Barrera_Errores DEBERÁ preservar el estado de la aplicación fuera del árbol de componentes fallido

### Requisito 3: Autenticación con Cookies HttpOnly

**Historia de Usuario:** Como ingeniero de seguridad, quiero que los tokens JWT se almacenen en cookies HttpOnly, para que estén protegidos de ataques XSS y no puedan ser accedidos por JavaScript del lado del cliente.

#### Criterios de Aceptación

1. CUANDO un usuario se autentica exitosamente, ENTONCES EL Backend DEBERÁ enviar el Token_JWT en una Cookie_HttpOnly
2. EL Cliente_HTTP DEBERÁ incluir credentials: 'include' en todas las peticiones HTTP
3. EL Sistema DEBERÁ eliminar todas las operaciones de lectura/escritura de localStorage para Token_JWT
4. EL Sistema DEBERÁ mantener datos de usuario no sensibles en localStorage (perfil de usuario, preferencias)
5. CUANDO el backend retorna un código de estado 401, ENTONCES EL Interceptor_Auth DEBERÁ limpiar automáticamente la sesión del usuario
6. CUANDO la sesión se limpia debido a un 401, ENTONCES EL Sistema DEBERÁ redirigir a /login
7. EL Hook_useAuth DEBERÁ validar autenticación verificando el estado de sesión del usuario, no leyendo tokens directamente
8. CUANDO la aplicación se inicializa, ENTONCES EL Sistema DEBERÁ verificar el estado de autenticación mediante una llamada API a /auth/me o endpoint similar

### Requisito 4: Manejo de Expiración de Sesión

**Historia de Usuario:** Como usuario, quiero que las sesiones expiradas se manejen automáticamente, para que sea redirigido a login sin encontrar errores confusos.

#### Criterios de Aceptación

1. CUANDO cualquier petición API recibe una respuesta 401 Unauthorized, ENTONCES EL Interceptor_Auth DEBERÁ activar la limpieza de sesión
2. EL Interceptor_Auth DEBERÁ limpiar el estado de usuario de memoria y localStorage
3. CUANDO la limpieza de sesión se completa, ENTONCES EL Sistema DEBERÁ redirigir a /login con la URL actual preservada
4. EL Sistema DEBERÁ mostrar un mensaje amigable indicando la expiración de sesión
5. CUANDO múltiples peticiones simultáneas reciben 401, ENTONCES EL Sistema DEBERÁ manejar la limpieza solo una vez

### Requisito 5: Compatibilidad Hacia Atrás

**Historia de Usuario:** Como desarrollador, quiero que las mejoras de seguridad mantengan la funcionalidad existente, para que los flujos OAuth y la experiencia de usuario permanezcan sin afectar.

#### Criterios de Aceptación

1. EL Sistema DEBERÁ mantener compatibilidad con el flujo de callback OAuth existente en /auth/callback
2. CUANDO un usuario completa la autenticación OAuth, ENTONCES EL Sistema DEBERÁ procesar el callback sin romperse
3. EL Sistema DEBERÁ preservar toda la gestión de estado de autenticación existente en Hook_useAuth
4. EL Sistema DEBERÁ mantener la estructura actual de datos de perfil de usuario en localStorage
5. CUANDO se migre a cookies HttpOnly, ENTONCES EL Sistema NO DEBERÁ romper endpoints API existentes que no requieren autenticación

### Requisito 6: Registro de Errores y Depuración

**Historia de Usuario:** Como desarrollador, quiero registro completo de errores, para poder depurar problemas efectivamente en desarrollo y producción.

#### Criterios de Aceptación

1. CUANDO una Barrera_Errores captura un error, ENTONCES EL Sistema DEBERÁ registrar el stack trace del error
2. CUANDO una Barrera_Errores captura un error, ENTONCES EL Sistema DEBERÁ registrar el stack de componentes donde ocurrió el error
3. EL Sistema DEBERÁ registrar errores en consola en entorno de desarrollo
4. EL Sistema DEBERÁ preparar la estructura de registro de errores para integración con servicio externo en producción
5. LA Barrera_Errores DEBERÁ incluir timestamp y contexto de usuario en los registros de error
6. CUANDO un error 401 activa la limpieza de sesión, ENTONCES EL Sistema DEBERÁ registrar el evento para depuración

### Requisito 7: Experiencia de Usuario Durante Errores

**Historia de Usuario:** Como usuario, quiero retroalimentación clara cuando ocurren errores, para entender qué sucedió y qué acciones puedo tomar.

#### Criterios de Aceptación

1. CUANDO una Barrera_Errores muestra UI_Alternativa, ENTONCES LA UI DEBERÁ mostrar un mensaje de error amigable para el usuario
2. LA UI_Alternativa DEBERÁ evitar exponer detalles técnicos del error a usuarios finales
3. LA UI_Alternativa DEBERÁ proporcionar un botón "Recargar" o "Intentar de nuevo"
4. CUANDO un usuario hace clic en el botón de recarga, ENTONCES EL Sistema DEBERÁ intentar recuperar el componente fallido
5. CUANDO la sesión expira, ENTONCES EL Sistema DEBERÁ mostrar un mensaje como "Tu sesión ha expirado. Por favor inicia sesión nuevamente."
6. LA UI_Alternativa DEBERÁ mantener estilos consistentes con el sistema de diseño de la aplicación

### Requisito 8: Pruebas y Validación

**Historia de Usuario:** Como desarrollador, quiero que los flujos críticos de autenticación y manejo de errores estén probados, para que las mejoras de seguridad sean confiables.

#### Criterios de Aceptación

1. EL Sistema DEBERÁ incluir pruebas para la validación de autenticación del Componente_Ruta_Protegida
2. EL Sistema DEBERÁ incluir pruebas para el comportamiento de redirección con URLs de destino preservadas
3. EL Sistema DEBERÁ incluir pruebas para la captura de errores de Barrera_Errores y renderizado de UI_Alternativa
4. EL Sistema DEBERÁ incluir pruebas para el manejo de 401 del Interceptor_Auth
5. EL Sistema DEBERÁ incluir pruebas para la gestión de estado de sesión del Hook_useAuth
6. EL Sistema DEBERÁ validar que Cliente_HTTP incluye credentials en las peticiones
