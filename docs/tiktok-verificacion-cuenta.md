# TikTok — Verificación de Propiedad de Cuenta

**Fecha:** 2026-02-25  
**Estado:** En decisión  
**Contexto:** Streamlyra usa ingeniería inversa (`tiktok-live-connector`) para conectarse a TikTok en lugar del Login Kit oficial. Esto implica que no hay OAuth ni tokens de identidad, el usuario solo ingresa su `@username` manualmente. Se necesita un mecanismo para verificar que quien ingresa el username es realmente el dueño de esa cuenta.

---

## Contexto técnico actual

- La conexión a TikTok **no usa el Login Kit oficial de TikTok** (el cual requiere revisión y aprobación de TikTok).
- Se usa la librería `tiktok-live-connector` que conecta via **ingeniería inversa** al live del usuario.
- El usuario ingresa su `@username` manualmente en la UI.
- El backend ya escucha los siguientes eventos en tiempo real:
  - `chat` → con los campos `userId`, `uniqueId`, `comment`, `isOwner: boolean`
  - `gift`, `follow`, `roomUser`
- El tipo `TikTokChatEvent` ya expone `isOwner: boolean`, que indica si el mensaje fue enviado por el streamer dueño del live.

---

## El problema

> **¿Cómo verificar que el usuario que ingresa `@username` en Streamlyra es realmente el dueño de esa cuenta TikTok?**

Sin OAuth no hay forma nativa de confirmar identidad. Se necesita un mecanismo alternativo que funcione dentro del ecosistema actual.

---

## Opciones evaluadas

---

### Opción 1 — Chat Code Challenge _(recomendada parcialmente)_

**Flujo:**

1. El usuario ingresa su `@username` en Streamlyra.
2. El sistema genera un **código único temporal** (ej. `SLY-A4F2`) con expiración (5 minutos).
3. La UI muestra el código y le pide al usuario que lo escriba en el chat de su live de TikTok.
4. El servidor escucha el evento `chat` y valida:
   - `data.uniqueId === username`
   - `data.comment` contiene el código
5. Si pasa la validación → cuenta verificada y guardada.

**Ventajas:**

- Simple de implementar, toda la infraestructura ya existe.
- `uniqueId` es el handle único de TikTok, no puede ser cambiado fácilmente.
- El código evita que alguien "adivine" el username de otro y lo registre.

**Desventajas:**

- Requiere que el usuario esté en live activo para verificar.
- El código queda visible en el chat público del live.
- Si el live no está activo, el flujo de verificación no puede completarse.

---

### Opción 2 — isOwner Flag (verificación silenciosa) _(recomendada parcialmente)_

**Flujo:**

1. El usuario ingresa su `@username` en Streamlyra.
2. El backend se conecta temporalmente al live.
3. Espera cualquier mensaje de chat con `isOwner === true`.
4. Si `data.uniqueId === username_ingresado` → cuenta verificada automáticamente.

**Ventajas:**

- Sin códigos ni comandos especiales → mejor UX.
- `isOwner` lo define el propio protocolo de TikTok (no el usuario).
- El streamer solo necesita escribir cualquier cosa en su chat.

**Desventajas:**

- TikTok podría cambiar la definición de `isOwner` en futuras versiones del protocolo (riesgo de ingeniería inversa).
- Si el live tiene co-hosts o moderadores con permisos elevados, hay que validar bien que `isOwner` sea exclusivo del dueño.

---

### Opción 3 — Scraping de perfil público _(descartada)_

**Idea:** Extraer el `userId` numérico del HTML de `https://www.tiktok.com/@username` y usarlo como verificación.

**Por qué descartarla:**

- Scraping de HTML, extremadamente frágil ante cambios de TikTok.
- TikTok usa protección Cloudflare y bot detection.
- No resuelve el problema de identidad sin acción del usuario.
- Alto riesgo de roturas sin previo aviso.

---

### Opción 4 — Token en Biografía _(descartada para producción, posible alternativa sin live)_

**Idea:** Generar un código único y pedirle al usuario que lo agregue temporalmente en la **bio/descripción** de su perfil de TikTok. El servidor hace fetch de la página pública y extrae la bio.

**Ventajas:**

- No requiere estar en live activo → aplica también fuera del live.
- Patrón probado y conocido (Google Search Console, GitHub, Twitter, etc.).

**Desventajas:**

- Depende de scraping HTML de TikTok → frágil y con riesgo de bloqueo.
- Mayor fricción de UX (el usuario tiene que ir a editar su perfil).
- TikTok activamente bloquea bots que accedan a sus perfiles.

---

## Recomendación combinada: Opción 1 + Opción 2

Combinar ambas ideas para obtener **doble factor de verificación** dentro del protocolo actual:

```
1. El usuario ingresa @username en Streamlyra
2. El backend conecta al live (ya lo hace en el flujo normal)
3. Se genera un código aleatorio de 6 chars (ej: SLY-4F2A)
4. La UI lo muestra con instrucciones: "Escribe este código en tu chat de TikTok"
5. El servidor escucha el evento `chat` y valida las 3 condiciones:
   ├── data.uniqueId === username_ingresado
   ├── data.isOwner === true                 (dueño del live)
   └── data.comment.includes(codigo)        (escribió el código)
6. Las 3 condiciones verdaderas → cuenta verificada → se guarda en DB
7. Si expira el tiempo → el código se invalida y hay que reintentar
```

**Por qué esta combinación es sólida:**

- `uniqueId` confirma que es la cuenta correcta.
- `isOwner` confirma que quien escribe es el dueño del live (no un espectador).
- El código evita suplantación: nadie más puede saber qué código generar.
- Toda la infraestructura ya existe (`TikTokEventListener`, evento `chat`, sockets).

---

## Pendiente de decisión

- [ ] ¿Se requiere estar en live para verificar? ¿O se necesita una opción sin live?
- [ ] ¿El código debe tener expiración fija (5 min) o basada en la sesión?
- [ ] ¿Dónde se guarda el estado de "pendiente de verificación"? (en memoria, Redis, DB)
- [ ] ¿Qué pasa si el usuario pierde el live antes de verificar?
- [ ] ¿Se muestra el proceso de verificación como un paso dentro del onboarding o en settings?

---

## Análisis de seguridad — ¿Qué pasa si alguien usa el @username de otra persona?

### El escenario de ataque

```
1. UserMalicioso ingresa @JuanStreamer en Streamlyra
2. Streamlyra lo acepta sin verificar y guarda en DB:
      provider: 'tiktok', providerId: 'JuanStreamer', userId: UserMalicioso
3. UserMalicioso empieza a ver el chat de JuanStreamer en Streamlyra
4. JuanStreamer (el dueño real) intenta registrar su propia cuenta
```

### Estado actual del modelo (sin verificación)

El índice único en la tabla `connections` es: `(provider, providerId)`.

Para TikTok, **el `providerId` es el `@username`** porque no se tiene acceso al ID numérico real (límite de la ingeniería inversa). Esto implica:

- `createOrUpdate` encontraría el registro de UserMalicioso y lo **sobreescribiría** con el `userId` de JuanStreamer.
- JuanStreamer eventualmente puede recuperar su cuenta, pero **UserMalicioso tuvo acceso al chat en el ínterin**.
- UserMalicioso puede repetir el ataque indefinidamente volviendo a ingresar el username.

### Cómo la verificación resuelve esto completamente

La regla fundamental es: **no guardar nada en la tabla `connections` hasta que la verificación sea exitosa.**

```
UserMalicioso ingresa @JuanStreamer
  → El estado "pendiente" vive solo en memoria/Redis (con TTL de 5 min)
  → Se le pide escribir el código en el chat de TikTok
  → UserMalicioso no puede escribir en el chat ajeno con isOwner = true
  → TTL expira → estado pendiente se elimina → nada se guarda en DB

JuanStreamer ingresa su propio @username
  → Escribe el código en su chat → isOwner = true → uniqueId coincide
  → Verificación exitosa → se guarda en DB
```

### Estado "pendiente de verificación" — dónde vive

| Opción                               | Pros                                         | Contras                                           |
| ------------------------------------ | -------------------------------------------- | ------------------------------------------------- |
| **Memoria del proceso (Map)**        | Simple, sin dependencias extra               | Se pierde si el servidor reinicia                 |
| **Redis con TTL**                    | Persistente, multi-instancia, TTL automático | Requiere Redis                                    |
| **DB con campo `verified: boolean`** | Persistente                                  | El registro "sucio" de UserMalicioso existe en DB |

**Recomendación:** Memoria del proceso (`Map`) para MVP. Redis si se escala.  
**Nunca usar DB** para guardar registros no verificados, porque rompe el índice único y deja datos sucios.

### Reglas adicionales de seguridad

- Un `@username` solo puede tener **una verificación pendiente a la vez** (si alguien ya está verificando ese username, rechazar nuevos intentos hasta que expire).
- El código de verificación debe ser **single-use** (invalidar al primer uso exitoso o fallido).
- El estado pendiente debe tener un **TTL estricto** (5 minutos máximo).

---

## Referencias internas

- `server/src/services/chat/tiktok/TikTokEventListener.ts` — Escucha evento `chat`
- `server/src/types/tiktok.types.ts` — Define `TikTokChatEvent` con `isOwner`, `uniqueId`, etc.
- `server/src/services/chat/tiktok/TikTokChatProvider.ts` — Orquesta el flujo de conexión
- `server/src/services/chat/tiktok/TikTokConnectionManager.ts` — Maneja la conexión a `tiktok-live-connector`
