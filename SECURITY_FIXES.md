# 🔒 Correcciones de Seguridad y Mejoras - Middleware

> **Fecha de análisis:** 2026-03-25  
> **Analista:** ElSantana  
> **Estado:** Pendiente de implementación

---

## 📋 RESUMEN EJECUTIVO

Se identificaron **5 correcciones** necesarias en el middleware del servidor:
- **2 críticas** (bugs y código peligroso)
- **3 recomendadas** (mejoras de seguridad y consistencia)

---

## 🔴 CRÍTICO - Arreglar Inmediatamente

### ✅ 1. Eliminar línea duplicada en el cliente

**Archivo:** `client/src/services/api/client.ts`  
**Línea:** 46  
**Tipo:** Bug - Código duplicado

**Problema:**
```typescript
// ANTES (líneas 45-48):
if (csrfToken) {
    requestHeaders['X-CSRF-Token'] = decodeURIComponent(csrfToken);
    requestHeaders['X-CSRF-Token'] = decodeURIComponent(csrfToken); // ← DUPLICADO
}
```

**Solución:**
```typescript
// DESPUÉS:
if (csrfToken) {
    requestHeaders['X-CSRF-Token'] = decodeURIComponent(csrfToken);
}
```

**Razón:** Código duplicado sin propósito funcional.

**Estado:** [x] ✅ Ya estaba correcto

---

### ✅ 2. Eliminar bypass CSRF innecesario y peligroso

**Archivo:** `server/src/middleware/csrf.middleware.ts`  
**Líneas:** 65-67  
**Tipo:** Código peligroso - Bypass innecesario

**Problema:**
```typescript
// ANTES (líneas 63-68):
export const verifyCsrf = (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!shouldValidateCsrf(req)) return next();

    if (config.nodeEnv === 'production' && req.headers.origin === config.frontendUrl) {
        return next();
    }

    const cookieToken = getCookie(req, CSRF_CONFIG.COOKIE_NAME);
    // ...
```

**Solución:**
```typescript
// DESPUÉS:
export const verifyCsrf = (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!shouldValidateCsrf(req)) return next();

    const cookieToken = getCookie(req, CSRF_CONFIG.COOKIE_NAME);
    // ...
```

**Razón:**
- CORS ya protege contra requests cross-origin
- El frontend siempre envía el token CSRF correctamente
- Este bypass viola el principio de defensa en profundidad
- No tiene caso de uso válido
- Puede convertirse en vulnerabilidad si CORS se modifica

**Impacto:** Ninguno - El frontend funciona perfectamente sin este bypass.

**Verificación realizada:**
- ✅ Tests automatizados: 14/14 pasaron
- ✅ Test manual: Requests normales funcionan correctamente
- ✅ Test manual: Requests sin CSRF token son bloqueadas (403)
- ✅ Navegador: Firefox - Todo funcionando

**Estado:** [x] ✅ Completado y verificado

---

## 🟡 RECOMENDADO - Mejorar Seguridad

### ✅ 3. Reducir tolerancia de timestamp a estándar de industria

**Archivo:** `server/src/middleware/webhooks/utils.ts`  
**Línea:** 20  
**Tipo:** Mejora de seguridad

**Problema:**
```typescript
// ANTES:
export const MAX_TIMESTAMP_AGE_MS = 10 * 60 * 1000; // 10 minutos
```

**Solución:**
```typescript
// DESPUÉS:
export const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000; // 5 minutos (estándar de industria)
```

**Razón:**
- Estándar de industria es 5 minutos
- Twitch recomienda 5 minutos en su documentación
- Reduce ventana de tiempo para replay attacks
- 10 minutos es excesivamente permisivo

**Impacto:** Bajo - Solo afectará webhooks con clock skew mayor a 5 minutos.

**Estado:** [x] ✅ Completado y verificado

**Verificación realizada:**
- ✅ Tests automatizados: 55/55 tests de webhooks pasaron
- ✅ Tests específicos: 14/14 tests de utils pasaron
- ✅ Documentación actualizada

---

### ✅ 4. Agregar validación de duplicados para Kick

**Archivos afectados:**
- `server/src/services/chat/kick/KickWebhookService.ts` (agregar función)
- `server/src/middleware/webhooks/kick.middleware.ts` (usar función)

**Tipo:** Consistencia - Paridad con Twitch

**Problema:** Kick no valida mensajes duplicados, mientras que Twitch sí lo hace.

**Solución Parte A - Agregar función al servicio:**

**Archivo:** `server/src/services/chat/kick/KickWebhookService.ts`

```typescript
export class KickWebhookService {
    private static processedMessages = new Set<string>();
    private static readonly MAX_CACHE_SIZE = 1000;

    // ... código existente ...

    /**
     * Verifica si un mensaje ya fue procesado (previene duplicados)
     */
    static isDuplicate(messageId: string): boolean {
        if (this.processedMessages.has(messageId)) {
            logger.debug({ messageId }, 'Kick Webhooks: Mensaje duplicado ignorado');
            return true;
        }

        this.processedMessages.add(messageId);
        
        // Limitar tamaño del cache
        if (this.processedMessages.size > this.MAX_CACHE_SIZE) {
            const firstElement = this.processedMessages.values().next().value;
            if (firstElement !== undefined) {
                this.processedMessages.delete(firstElement);
            }
        }

        return false;
    }
}
```

**Solución Parte B - Usar en middleware:**

**Archivo:** `server/src/middleware/webhooks/kick.middleware.ts`

Agregar después de la validación de firma (aproximadamente línea 72):

```typescript
// Después de validar la firma y antes de req.webhookData
if (KickWebhookService.isDuplicate(messageId)) {
    return res.status(200).send('OK (Duplicate)');
}

req.webhookData = {
    // ...
```

**Razón:**
- Consistencia con implementación de Twitch
- Previene procesamiento duplicado si Kick reenvía eventos
- Patrón ya probado y testeado en producción
- Mejora la robustez del sistema

**Impacto:** Ninguno negativo - Solo previene duplicados.

**Estado:** [ ] Pendiente (Parte A)  
**Estado:** [ ] Pendiente (Parte B)

---

## 🟢 OPCIONAL - Mejoras Menores

### ✅ 5. Reducir logging del challenge de Kick

**Archivo:** `server/src/middleware/webhooks/kick.middleware.ts`  
**Línea:** 45  
**Tipo:** Mejora de logging

**Problema:**
```typescript
// ANTES:
logger.info({ challenge }, 'KICK CHALLENGE RECEIVED: Verificando webhook');
```

**Solución:**
```typescript
// DESPUÉS:
logger.info({ challengeLength: challenge?.length }, 'KICK CHALLENGE RECEIVED: Verificando webhook');
```

**Razón:** 
- Evitar loggear información potencialmente sensible
- El challenge completo no es necesario para debugging
- La longitud es suficiente para validar que existe

**Impacto:** Ninguno funcional - Solo mejora privacidad en logs.

**Estado:** [ ] Pendiente

---

## 📊 TABLA DE SEGUIMIENTO

| # | Archivo | Línea | Tipo | Prioridad | Estado |
|---|---------|-------|------|-----------|--------|
| 1 | `client/src/services/api/client.ts` | 46 | Bug | 🔴 Crítico | [x] ✅ Ya estaba correcto |
| 2 | `server/src/middleware/csrf.middleware.ts` | 65-67 | Código peligroso | 🔴 Crítico | [x] ✅ Completado |
| 3 | `server/src/middleware/webhooks/utils.ts` | 20 | Mejora seguridad | 🟡 Recomendado | [x] ✅ Completado |
| 4a | `server/src/services/chat/kick/KickWebhookService.ts` | Nueva función | Consistencia | 🟡 Recomendado | [ ] |
| 4b | `server/src/middleware/webhooks/kick.middleware.ts` | ~72 | Consistencia | 🟡 Recomendado | [ ] |
| 5 | `server/src/middleware/webhooks/kick.middleware.ts` | 45 | Mejora logging | 🟢 Opcional | [ ] |

---

## 🎯 PLAN DE IMPLEMENTACIÓN

### Fase 1 - Inmediata (5 minutos) ✅ COMPLETADA
- [x] ✅ Corregir #1: Eliminar línea duplicada en cliente (Ya estaba correcto)
- [x] ✅ Corregir #2: Eliminar bypass CSRF (Completado y testeado)

**Impacto:** Ninguno negativo - Solo limpia código.
**Tests:** ✅ 14/14 tests pasaron correctamente

### Fase 2 - Corto plazo (15 minutos) ✅ COMPLETADA (Punto #3)
- [x] ✅ Implementar #3: Reducir timestamp tolerance (Completado y testeado)
- [ ] Implementar #4a: Agregar función isDuplicate a KickWebhookService
- [ ] Implementar #4b: Usar isDuplicate en middleware de Kick

**Impacto:** Mejora seguridad y consistencia.
**Tests:** ✅ 55/55 tests de webhooks pasaron correctamente

### Fase 3 - Opcional (2 minutos)
- [ ] Implementar #5: Mejorar logging de challenge

**Impacto:** Mejora privacidad en logs.

---

## ✅ ASPECTOS POSITIVOS IDENTIFICADOS

Durante el análisis se confirmó que el código tiene:

1. ✅ **Excelente uso de timing-safe comparison** en CSRF (`crypto.timingSafeEqual`)
2. ✅ **Encriptación AES-256-GCM correctamente implementada** con IV aleatorio y auth tag
3. ✅ **Validación estricta de tipos** en JWT payload
4. ✅ **Separación de concerns** entre autenticación, autorización y validación
5. ✅ **Logging estructurado** con niveles apropiados
6. ✅ **Rate limiting diferenciado** por tipo de endpoint
7. ✅ **Validación de firmas HMAC** correctamente implementada para todos los webhooks
8. ✅ **CORS configurado correctamente** como primera línea de defensa

---

## 📝 NOTAS ADICIONALES

### Lo que NO se debe hacer:
- ❌ No cambiar rate limiting sin datos de tráfico real que justifiquen el cambio
- ❌ No implementar token blacklist sin necesidad demostrada
- ❌ No agregar validación de IP (complica deployment y CDN)
- ❌ No exponer stack traces en producción (ya está bien implementado)

### Verificaciones post-implementación:
- [x] ✅ Ejecutar tests existentes: `npm test` (14/14 pasaron)
- [x] ✅ Verificar que el frontend sigue funcionando correctamente
- [x] ✅ Revisar logs en desarrollo para confirmar comportamiento esperado
- [ ] Validar que webhooks siguen procesándose correctamente (pendiente para puntos #3-5)

---

## 🔒 ANÁLISIS DE SEGURIDAD - PUNTO #2

### ¿Por qué era seguro eliminar el bypass?

**Capas de seguridad actuales (después del cambio):**
```
Request → CORS (valida origin) → CSRF (valida token) → Endpoint
          ↓                      ↓
          Bloquea si origin      Bloquea si no hay token
          no es válido           o no coincide
```

**Antes del cambio (con bypass):**
```
Request → CORS → CSRF (con bypass) → Endpoint
                 ↓
                 Si origin == frontend → SKIP validación ❌ PELIGROSO
```

### Protecciones activas:

1. ✅ **CORS** valida que las requests vengan del frontend autorizado
2. ✅ **CSRF** valida que el token cookie coincida con el header
3. ✅ **Timing-safe comparison** (`crypto.timingSafeEqual`) previene timing attacks
4. ✅ **HttpOnly cookies** para `auth_token` (no accesibles desde JavaScript)
5. ✅ **SameSite cookies** previenen CSRF básico
6. ✅ **Rate limiting** previene brute force

### Escenarios de ataque bloqueados:

| Escenario | Con Bypass | Sin Bypass (Actual) |
|-----------|------------|---------------------|
| Request normal del frontend | ✅ Pasa | ✅ Pasa |
| Request sin CSRF token | ⚠️ Pasaba si origin válido | ❌ Bloqueado |
| Request con origin falsificado | ⚠️ Pasaba si origin válido | ❌ Bloqueado |
| Ataque CSRF desde navegador | ❌ CORS bloquea | ❌ CORS bloquea |
| Script malicioso (curl/postman) | ⚠️ Pasaba con origin válido | ❌ Bloqueado |

### Conclusión:
- ✅ **Más seguro** - Elimina vector de ataque potencial
- ✅ **Más simple** - Menos casos especiales
- ✅ **Más robusto** - Defensa en profundidad
- ✅ **Sin impacto** - El frontend funciona perfectamente

---

## 🔗 REFERENCIAS

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Twitch EventSub Documentation](https://dev.twitch.tv/docs/eventsub/)
- [HMAC Timing Attack Prevention](https://codahale.com/a-lesson-in-timing-attacks/)

---

**Documento creado por:** ElSantana  
**Última actualización:** 2026-03-25  
**Versión:** 1.0
