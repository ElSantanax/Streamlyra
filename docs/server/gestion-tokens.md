# Gestión de Tokens OAuth

Uno de los sistemas más silenciosos pero críticos de Streamlyra es la gestión automática de tokens de OAuth. Los tokens de acceso expiran (Twitch a las 4 horas, YouTube a la hora). Sin renovación automática, el chat dejaría de funcionar sin previo aviso.

## `TokenRefreshService.ts`

Este servicio es el responsable de mantener los tokens siempre válidos, sin que el usuario tenga que hacer nada.

### Cómo Decide si Refrescar

```
1. ¿El token existe en la BD?
   - No → Devuelve null ("no hay sesión")
2. ¿La plataforma es TikTok?
   - Sí → Devuelve el token directamente (no tiene refresh token)
3. ¿Le quedan más de 5 minutos al token actual?
   - Sí → Lo devuelve directamente (aún válido)
4. ¿Hay ya un refresco en progreso para este usuario/plataforma?
   - Sí → Reutiliza la misma Promise (evita doble llamada a la API)
5. Inicia el proceso de refresco...
```

### Lógica de Reintentos (Exponential Backoff + Jitter)

Si el refresco falla por un error de red transitorio (timeout, error 500 del servidor), lo reintenta hasta **3 veces** con esperas exponenciales:

- **Intento 1**: Espera ~1s
- **Intento 2**: Espera ~2s + ruido aleatorio
- **Intento 3**: Espera ~4s + ruido aleatorio

El "jitter" (ruido aleatorio) evita que múltiples usuarios intenten refrescar al mismo tiempo, distribuyendo la carga.

### Detección de Token Revocado

Si el refresco falla con `invalid_grant`, `invalid_token` o un error 400/401, el servicio entiende que el usuario **revocó el acceso manualmente** desde su cuenta de Twitch/YouTube. Ante esto:

1. Llama a `connectionRepository.clearTokens()` para **borrar los tokens de la BD**.
2. El sistema queda limpio, listo para que el usuario vuelva a conectar su cuenta.

## `ConnectionService.ts`

La fachada que los demás servicios usan para obtener tokens válidos. Delega en `TokenRefreshService` para la renovación, pero también gestiona:

- `getAllConnections(userId)`: Lista todas las cuentas vinculadas.
- `removeConnection(userId, platform)`: Desvincula una plataforma.
- `getAccount(userId, platform)`: Obtiene una conexión específica, con su token ya desencriptado.