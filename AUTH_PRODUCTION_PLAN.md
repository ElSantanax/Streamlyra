# Streamlyra – Plan de Refactor + Hardening de Auth para Producción

> Este documento incluye dos tracks:
> 1) **Refactor (Client)**: ordenar el estado de auth (AuthProvider + status) para evitar duplicación y mejorar UX.
> 2) **Hardening (Server/Client)**: seguridad y configuración production-ready (CSRF, cookies, CORS).

## Estado actual (implementado vs pendiente)

- **Implementado**
  - Fase 1 – CSRF mínimo viable (double-submit: cookie `csrf_token` + header `X-CSRF-Token`).
  - Ajustes para despliegue **cross-domain**: cookies en producción con `SameSite=None`.
  - Track A (Client): AuthProvider + `status` + eliminar `window.location.href`.
  - Fase 3 – Cookies + CORS por entorno (config centralizada de cookies).
  - Fase 4 – Pruebas automatizadas E2E (tests de autenticación completos).
- **Pendiente**
  - Ninguna fase pendiente. ✅ **Plan de autenticación completado al 100%**

## 1) Contexto y cómo funciona hoy

### 1.1 Client (`client/src`)
- **Routing principal:** `client/src/App.tsx`
  - Rutas públicas: `/`, `/login`, `/register`, `/auth/callback`
  - Rutas protegidas: `/connect`, `/dashboard` usando `ProtectedRoute`
- **Guard de rutas:** `client/src/components/common/ProtectedRoute.tsx`
  - Decide “autenticado” basándose en `useAuth().isAuthenticated`.
  - Si no, redirige a `/login?redirect=...`.
- **Bootstrap de sesión (perfil actual):** `client/src/hooks/useAuth.ts`
  - Usa `localStorage` (`useLocalStorage('user')`) para persistencia de UI.
  - `checkAuth()` llama `authService.getMe()`.
  - Deduplicación: `inFlightAuthCheck`.
  - Bootstrap único: `hasBootstrappedAuth`.
  - Evita llamar `/auth/me` en rutas públicas y cuando no es necesario.
- **HTTP client:** `client/src/api/client.ts`
  - `fetch(..., credentials: 'include')` para soportar cookie HttpOnly.
  - Manejo global de 401: solo cuando `requiresAuth=true` y no estás en rutas públicas.
- **Auth API wrapper:** `client/src/api/services/auth.service.ts`
  - `exchangeCode()` usa `requiresAuth=true`.
  - `getMe()` usa `requiresAuth=false` (best-effort bootstrap).
- **Manejo de “sesión expirada”:** `client/src/services/AuthService.ts`
  - Limpia storage y redirige.
  - Hoy lo hace con `window.location.href`.

### 1.2 Server (`server/src`)
- **Servidor y middlewares:** `server/src/server.ts`
  - CORS con `credentials: true` y `origin: config.frontendUrl`.
  - `cookieParser()` habilitado.
  - Rutas montadas:
    - `/api/auth` -> `createAuthRoutes`
    - `/api/webhooks`
- **Auth routes:** `server/src/routes/auth.routes.ts`
  - `GET /api/auth/me` protegido con `authenticateToken`.
  - OAuth routes (`/twitch`, `/youtube`, `/kick`) usan `optionalAuthenticate`.
- **JWT extraction:** `server/src/middleware/auth.middleware.ts`
  - Extrae token de cookie `auth_token` (preferido) o header `Authorization`.
- **Cookie issuance:** `server/src/controllers/auth.controller.ts`
  - En OAuth success setea cookie HttpOnly `auth_token`.
  - Cookie config actual:
    - `httpOnly: true`
    - `secure: NODE_ENV === 'production'`
    - `sameSite: 'none'` en producción (cross-domain) / `lax` en dev
    - `path: '/'`
    - `maxAge: 30 días`
  - También emite cookie `csrf_token` (NO HttpOnly) para CSRF.

## 2) Invariantes importantes (que no debemos romper)
- **La fuente de verdad real de sesión es el backend** (cookie HttpOnly `auth_token`).
- El `user` en `localStorage` **es solo UX** (optimista), no seguridad.
- El proxy de Vite (`client/vite.config.ts`) enruta `/api -> http://localhost:4000` en dev.
- Rutas protegidas deben:
  - redirigir a `/login?redirect=...` si no hay sesión
  - permitir navegar si la sesión existe

## 3) Riesgos / gaps para Producción

### 3.1 CSRF (alto)
Al usar cookies para autenticación (`credentials: include`), el riesgo principal pasa a ser **CSRF**.
- Estado actual: **CSRF mínimo viable implementado** (double-submit cookie + header).
- Impacto: un sitio tercero podría intentar disparar requests autenticados desde el navegador del usuario.

### 3.2 Redirecciones con recarga dura
`AuthService.handleSessionExpired()` hace `window.location.href = ...`.
- Funciona, pero es brusco y aumenta riesgo de loops si se cambia lógica.
- Mejor: redirección SPA controlada por Router.

### 3.3 Estado de auth distribuido
`useAuth()` es usado por varios componentes.
- Se mitigó con dedupe/bootstrapping, pero el patrón más robusto es **AuthProvider**.

### 3.4 Cookies y despliegues cross-domain
En producción, si frontend/back-end quedan en dominios distintos:
- `sameSite: 'lax'` puede fallar en algunos flujos.
- probablemente necesites `SameSite=None; Secure`.

### 3.5 Observabilidad y UX
- 401 “esperados” en `/me` no deberían verse como errores en consola.
- Necesitamos logging consistente y no ruidoso.

## 4) Recomendaciones priorizadas (KISS + bajo riesgo)

### Prioridad 0 – Estabilidad (ya aplicado)
- Evitar loops de redirección en 401.
- Evitar múltiples llamadas a `/api/auth/me` por mounts duplicados.
- Separar bootstrap (`/me`) de acciones protegidas.

### Prioridad 1 – Seguridad base (producción)
1. **Implementar CSRF** (mínimo viable):
   - Opción A (recomendada): Double-submit cookie + header `X-CSRF-Token`.
   - Opción B: SameSite=Strict (no siempre viable con OAuth).
2. **Revisar configuración de cookies por entorno**:
   - Dev: `secure: false`, `sameSite: 'lax'`.
   - Prod: si mismo dominio: `secure: true`, `sameSite: 'lax'` o `strict`.
   - Prod cross-site: `secure: true`, `sameSite: 'none'`.

### Prioridad 2 – Arquitectura/UX
3. **AuthProvider (Context)** para centralizar:
   - `authStatus`: `unknown | authenticated | unauthenticated`
   - `user`
   - `bootstrap()`
   - `logout()`
   - handler de sesión expirada sin recarga.
4. **ProtectedRoute basado en status**:
   - si `unknown`: mostrar spinner
   - si `unauthenticated`: redirect
   - si `authenticated`: render

### Prioridad 3 – Hardening adicional
5. **Rate limiting / brute-force / abuse** (si aplican rutas de login propias).
6. **Rotación de tokens / refresh** (si tu UX requiere sesiones largas más seguras).
7. **E2E tests de auth** (Playwright/Cypress) para flujos críticos.

## 5) Plan por fases (incremental y verificable)

### Track A – Refactor (Client)

#### Fase R1 – AuthProvider (Context) como fuente única de estado
**Objetivo:** centralizar auth para que el “bootstrap” ocurra una sola vez y el UI no dependa de múltiples mounts.

**Alcance**
- Crear `AuthProvider` que exponga:
  - `status`: `unknown | authenticated | unauthenticated`
  - `user`
  - `bootstrap()` (llama `/api/auth/me` en modo best-effort)
  - `logout()`

**Pasos**
1. Crear el Provider y envolver `App` con él.
2. Mover la lógica actual de `useAuth` (bootstrap/dedupe) al Provider.
3. Exponer un hook `useAuth()` del contexto (y renombrar el hook actual si hace falta para evitar colisiones).

**Criterios de aceptación**
- El bootstrap hacia `/api/auth/me` ocurre **una sola vez** en una carga normal.
- No existen loops/redirecciones por 401.
- Componentes (Navbar, páginas) consumen auth desde el contexto.

#### Fase R2 – ProtectedRoute basado en `status`
**Objetivo:** UX consistente.

**Comportamiento**
- `unknown`: mostrar spinner.
- `unauthenticated`: redirect a `/login?redirect=...`.
- `authenticated`: render children.

**Criterios de aceptación**
- Reload en `/dashboard` con cookie válida no “parpadea” a login.
- Reload sin cookie redirige una vez a login.

#### Fase R3 – Eliminar recarga dura en expiración
**Objetivo:** evitar `window.location.href` y usar navegación SPA.

**Pasos**
- Reemplazar el uso de `window.location.href` por navegación controlada (router) o por un método del Provider.

**Criterios de aceptación**
- Expiración real limpia estado y redirige sin recargar la app completa.

### Fase 1 – CSRF mínimo viable (server + client)
**Objetivo:** proteger endpoints mutadores (POST/PUT/PATCH/DELETE) bajo cookie auth.

- **Server**
  - Emitir cookie `csrf_token` (NO HttpOnly) con valor aleatorio por sesión (o por request, según estrategia).
  - Middleware que valida que en requests mutadores exista:
    - cookie `csrf_token` y
    - header `X-CSRF-Token` iguales.
  - Excluir de CSRF (si aplica):
    - `GET` y rutas públicas.
- **Client**
  - `HttpClient` agrega header `X-CSRF-Token` leyendo cookie `csrf_token`.

**Estado:** completado.

**Implementación (archivos):**
- `server/src/middleware/csrf.middleware.ts`
- `server/src/server.ts`
- `server/src/controllers/auth.controller.ts`
- `client/src/api/client.ts`

**Checklist de pruebas**
- POST /api/auth/logout funciona.
- DELETE /api/auth/platform funciona autenticado.
- Requests mutadores sin header CSRF fallan con 403.


### Fase 2 – AuthProvider y eliminación de recarga dura
**Objetivo:** una sola fuente de verdad de auth en el client; sin `window.location.href`.

- Crear `client/src/context/AuthProvider.tsx` (o similar):
  - Estado: `user`, `status`, `isBootstrapping`.
  - `bootstrap()` llama `/auth/me` (best-effort).
  - `logout()` llama `/auth/logout` y limpia estado.
  - Exponer hook `useAuthContext()`.
- Actualizar `ProtectedRoute`:
  - si `status === 'unknown'`: spinner
  - si `unauthenticated`: redirect
- Reemplazar el uso directo de `useAuth()` en componentes por el contexto.
- Cambiar `AuthService.handleSessionExpired()`:
  - en vez de recarga: disparar `logout()` del contexto o un callback.

**Checklist de pruebas**
- No hay múltiples llamadas a `/auth/me` en navegación.
- Reload en `/dashboard` con cookie válida restaura sesión.
- Expiración real (forzada) redirige una vez a `/login` sin loop.


### Fase 3 – Configuración production-ready (cookies + CORS)
**Objetivo:** despliegue seguro y compatible.

- Introducir variables de entorno claras:
  - `FRONTEND_URL` (ya existe)
  - `COOKIE_SAMESITE` y `COOKIE_SECURE` (opcional) o inferido por entorno.
- Confirmar `CORS`:
  - `origin` debe ser exacto (no `*`) cuando `credentials=true`.
- Si hay dominios distintos en prod:
  - setear `SameSite=None; Secure`.

**Checklist de pruebas**
- En prod HTTPS: cookie se setea y persiste.
- En cross-domain (si aplica): cookie viaja correctamente.


### Fase 4 – Pruebas automatizadas (mínimo)
**Objetivo:** evitar regresiones de auth.

- Agregar tests E2E para:
  - acceso a `/dashboard` sin sesión -> redirect
  - login OAuth (mock si es posible) -> cookie set y `/dashboard`
  - logout -> cookie cleared -> `/login`

**Estado:** ✅ **completado**.

**Implementación (archivos):**
- `client/cypress/e2e/auth.cy.ts`

**Tests implementados:**
1. ✅ **Anon -> ruta protegida**: Redirige a `/login?redirect=/dashboard`
2. ✅ **Logout completo**: Usuario autenticado hace logout y vuelve a `/login`
3. ✅ **OAuth login simulado**: Mock de callback OAuth redirige a dashboard
4. ✅ **Expiración de sesión**: 401 en acción protegida redirige a login y limpia storage

**Checklist de pruebas**
- ✅ Acceso a `/dashboard` sin sesión redirige a `/login`.
- ✅ Login OAuth mockeado termina en `/dashboard`.
- ✅ Logout limpia cookie y vuelve a `/login`.
- ✅ Sesión expirada (401) redirige a `/login` y limpia storage.

## 8) Plan de testing (recomendado) – Unit, Integración y E2E

> Meta: cubrir los flujos críticos de autenticación con el **mínimo** set de pruebas que detecte regresiones reales.

### 8.1 Unit tests (rápidos, aislados)

#### Client (Vitest)
- **HttpClient (`client/src/api/client.ts`)**
  - **Caso: `requiresAuth=false` + 401**
    - No debe disparar `authService.handleSessionExpired()`.
  - **Caso: `requiresAuth=true` + 401 en ruta no pública**
    - Debe disparar `authService.handleSessionExpired()` exactamente una vez.
  - **Caso: 401 en rutas públicas** (`/login`, `/register`, `/auth/callback`)
    - Nunca debe disparar `handleSessionExpired()`.

- **useAuth (`client/src/hooks/useAuth.ts`)**
  - **Dedupe:** múltiples llamadas simultáneas a `checkAuth()` deben generar una sola llamada a `apiAuthService.getMe()`.
  - **Bootstrap:** no debe ejecutar `checkAuth()` en rutas públicas.
  - **Bootstrap condicionado:** si no hay `user` y no es ruta protegida, no llama `/me`.

- **ProtectedRoute (`client/src/components/common/ProtectedRoute.tsx`)**
  - Si `isAuthenticated=false`, redirige a `/login?redirect=...`.
  - Si `isAuthenticated=true`, renderiza children.

#### Server (Jest o Vitest)
- **extractToken/verifyToken (`server/src/middleware/auth.middleware.ts`)**
  - **Token desde cookie**: usa `auth_token`.
  - **Token desde header**: usa `Authorization: Bearer ...`.
  - **Token ausente**: `authenticateToken` produce 401.

### 8.2 Integration tests (HTTP real contra Express)

> Aquí el objetivo es validar contratos HTTP sin depender del navegador.

#### Server API (Supertest)
- **GET `/api/auth/me`**
  - Sin cookie -> 401.
  - Con cookie válida -> 200 y retorna perfil.
  - Con cookie inválida -> 403.
  - Con cookie expirada -> 403.

- **POST `/api/auth/logout`**
  - Debe limpiar cookie `auth_token` (verificar `Set-Cookie` con expiración/clear).

- **Si implementas CSRF (Fase 1)**
  - POST/DELETE sin `X-CSRF-Token` -> 403.
  - POST/DELETE con `X-CSRF-Token` correcto -> 200.

### 8.3 E2E tests (Playwright recomendado)

> Cubre comportamiento real del usuario. No necesitas testear TODO, solo flujos críticos.

#### Escenarios mínimos
1. **Anon -> ruta protegida**
   - Ir a `/dashboard`.
   - Esperado: redirige a `/login` con `redirect=/dashboard`.

2. **Login (simulado) -> dashboard**
   - Opción A (recomendada): endpoint de test/seed en entorno de test que setee cookie `auth_token`.
   - Opción B: mockear OAuth callback navegando a `/auth/callback?code=...` con intercept de request.
   - Esperado: termina en `/dashboard`.

3. **Logout**
   - Estando autenticado, ejecutar logout desde UI.
   - Esperado: vuelve a `/` o `/login`.
   - Verificar: ya no hay cookie `auth_token`.

4. **Expiración real**
   - Setear cookie inválida/expirada.
   - Ir a una acción con `requiresAuth=true`.
   - Esperado: redirige una vez a `/login` y limpia storage.

#### Recomendación de infraestructura para E2E
- Levantar `server` y `client` en modo test.
- Usar una DB de test o sqlite (si tu stack lo permite) o un esquema aislado.
- Asegurar que los tests no dependan de proveedores externos (Twitch/YouTube/Kick) en CI.

### 8.4 Checklist manual (rápido, antes de merge a main)
- **Sin sesión**
  - Entrar a `/` y `/login`: no debe spammear `/api/auth/me`.
  - Entrar a `/dashboard`: redirige a `/login?redirect=...`.
- **Con sesión**
  - Reload en `/dashboard`: permanece autenticado.
  - Logout: limpia cookie y vuelve a estado anónimo.
- **Seguridad**
  - Cookies en prod: `Secure` + `SameSite` correcto.
  - Si hay CSRF: endpoints mutadores rechazan requests sin token.

## 6) Decisiones y trade-offs
- **Cookie HttpOnly vs localStorage:** cookie es mejor seguridad; localStorage solo para UX.
- **CSRF:** necesario cuando se usan cookies. El costo de implementación vale la pena.
- **AuthProvider:** pequeño refactor, alto beneficio en coherencia y producción.

## 7) Orden recomendado de ejecución
### Opción recomendada (producción pronto)
1. Fase 1 (CSRF)
2. Track A: Fase R1–R3 (Refactor Client)
3. Fase 3 (cookie/CORS por entorno)
4. Fase 4 (E2E)

### Opción recomendada (mejorar UX primero)
1. Track A: Fase R1–R3 (Refactor Client)
2. Fase 1 (CSRF)
3. Fase 3 (cookie/CORS por entorno)
4. Fase 4 (E2E)
