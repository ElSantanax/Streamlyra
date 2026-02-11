# 🔥 BUGS PRIORITARIOS - FIX INMEDIATO

Este documento lista los bugs críticos que requieren atención inmediata en el flujo de conexión de plataformas.

---

## 🚨 BUG CRÍTICO #1: Race Condition en Migración de Tokens

**Ubicación**: `server/src/repositories/implementations/ConnectionRepository.ts:60`

**Problema**: Si falla el `save()` durante la auto-migración de tokens legacy, el método retorna la conexión con tokens encriptados en memoria pero sin persistir en BD. Esto causa:

- Siguiente lectura los detecta como legacy nuevamente
- Ciclo infinito de intentos de migración
- Posible pérdida de tokens

**Fix**:

```typescript
if (needsUpdate) {
  try {
    await connection.save({ transaction });
  } catch (err) {
    logger.error(
      { err, context },
      "Failed to persist auto-migrated encrypted tokens",
    );
    throw new Error("Failed to migrate encrypted tokens"); // ✅ Propagar error
  }
}
```

**Prioridad**: 🔴 ALTA  
**Estimación**: 10 minutos

---

## 🚨 BUG CRÍTICO #2: Refresh Token Expirado No Se Detecta

**Ubicación**: `server/src/services/connection/TokenRefreshService.ts:106-136`

**Problema**: Cuando un `refresh_token` expira, el método solo registra el error y retorna `null`, pero **NO marca la conexión como inválida**. Resultado:

- Usuario queda con conexión "activa" pero sin tokens válidos
- Todos los intentos de chat/envío fallan silenciosamente
- Usuario debe reconectar manualmente sin recibir notificación clara

**Fix**:

```typescript
catch (error) {
    const errorMessage = error instanceof Error ? error.message : '';

    // Detectar refresh token expirado
    if (errorMessage.includes('invalid_grant') ||
        errorMessage.includes('expirado') ||
        errorMessage.includes('invalid_token')) {

        logger.error({ platform, connectionId: connection.id },
            'Refresh token expired, connection requires re-authentication');

        // Desactivar la conexión o marcar para reconexión
        await connection.update({
            accessToken: '',
            refreshToken: '',
            expiryDate: null
        });

        // Emitir evento al socket para notificar al usuario
        // TODO: Agregar emisión de evento 'token_expired'
    }

    logger.error({ err: error, platform, connectionId: connection.id },
        'Failed to refresh token');
    return null;
}
```

**Prioridad**: 🔴 ALTA  
**Estimación**: 30 minutos

---

## 🚨 BUG CRÍTICO #3: Validación Inconsistente de Twitch

**Ubicación**: `server/src/services/auth/core/PlatformAuthHandler.ts:58-59`

**Problema**: La validación `hasTwitch` usa OR lógico entre `user.connections.some()` y una consulta adicional. Si `user.connections` está desactualizado o es `undefined`, el resultado podría ser un objeto `Connection` en lugar de boolean.

```typescript
// ❌ Problema
const hasTwitch =
  (user.connections && user.connections.some((c) => c.provider === "twitch")) ||
  (await this.connectionRepository.findByUserAndProvider(
    user.id,
    "twitch",
    transaction,
  ));
// hasTwitch puede ser: true | false | Connection | null (inconsistente)
```

**Fix**:

```typescript
// ✅ Solución
const twitchConnection = await this.connectionRepository.findByUserAndProvider(
  user.id,
  "twitch",
  transaction,
);
const hasTwitch = !!twitchConnection; // Siempre boolean
```

**Prioridad**: 🟡 MEDIA-ALTA  
**Estimación**: 15 minutos

---

## 🚨 BUG CRÍTICO #4: Code Verifier Faltante en Kick OAuth

**Ubicación**: `client/src/pages/AuthCallback.tsx:36-38`

**Problema**: Si un usuario inicia OAuth de Kick pero cierra el tab o borra localStorage antes de completar, el callback envía `undefined` como `code_verifier` al servidor, causando error de verificación PKCE.

**Flujo del problema**:

1. Usuario inicia OAuth Kick → PKCE generado y guardado en localStorage
2. Usuario cierra tab o localStorage se borra
3. Callback intenta leer → obtiene `null`
4. Se envía petición con `code_verifier: undefined`
5. **Error de Kick API: "PKCE verification failed"**

**Fix**:

```typescript
if (platform === "kick") {
  codeVerifier = localStorage.getItem("kick_verifier") || undefined;
  localStorage.removeItem("kick_verifier");

  // ✅ Validar que existe
  if (!codeVerifier) {
    toast.error(
      "Sesión de autenticación expirada. Por favor, intenta conectar nuevamente.",
    );
    navigate("/dashboard");
    return;
  }
}
```

**Prioridad**: 🟡 MEDIA  
**Estimación**: 10 minutos

---

## 🔧 BUG MODERADO #5: connectingUsers No Se Limpia en Path Alternativo

**Ubicación**: `server/src/services/chat/twitch/TwitchChatProvider.ts:42-60`

**Problema**: En el bloque donde ya existe un cliente activo, se ejecutan operaciones async pero el `return` es directo, **sin** limpiar `connectingUsers` en caso de error.

**Fix**:

```typescript
if (this.activeClients.has(userId)) {
  try {
    logger.debug(
      { userId },
      "User already has active Twitch client, refreshing state",
    );
    SafeSocketEmitter.emitConnectionStatus(
      io,
      userId,
      "twitch",
      "connected",
      "Conectado",
    );

    const connection = await Connection.findOne({
      where: { userId: String(userId), provider: "twitch" },
    });

    if (connection?.providerUsername) {
      const getAccessToken = async () =>
        this.connectionService.getValidAccessToken(userId, "twitch");
      const validToken = await getAccessToken();
      const accessToken = validToken || connection.accessToken;

      this.viewerPoller.startPolling(
        userId,
        connection.providerUsername,
        accessToken,
        io,
      );
      if (connection.providerId) {
        this.followerPoller.startPolling(
          userId,
          connection.providerId,
          getAccessToken,
          io,
        );
      }
    }
  } catch (error) {
    logger.error({ err: error, userId }, "Error refreshing Twitch state");
  } finally {
    this.connectingUsers.delete(userId); // ✅ Siempre limpiar
  }
  return;
}
```

**Prioridad**: 🟡 MEDIA  
**Estimación**: 10 minutos

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

```markdown
- [x] Bug #1: Race condition en migración de tokens
- [x] Bug #2: Detección de refresh token expirado
- [x] Bug #3: Validación consistente de hasTwitch
- [x] Bug #4: Validación de code_verifier en Kick
- [x] Bug #5: Limpieza de connectingUsers en Twitch
- [ ] Ejecutar tests de regresión
- [ ] Validar en ambiente de staging
- [ ] Deploy a producción
```

---

## 🎯 TIEMPO ESTIMADO TOTAL

**1 hora 25 minutos** para completar todos los fixes críticos y moderados.

---

**ElSantana**
