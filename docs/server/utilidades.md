# Utilidades y Constantes Críticas

Para mantener el código del servidor limpio y libre de duplicación, Streamlyra utiliza un conjunto de herramientas de apoyo en `src/utils` y definiciones globales en `src/constants`.

## Utilidades del Sistema (`src/utils/`)

### 1. `SafeSocketEmitter.ts`

Es un envoltorio (wrapper) de seguridad sobre Socket.io.

- **Validación de Room**: Antes de emitir un evento, comprueba si el usuario tiene realmente "rooms" (ventanas del navegador) abiertas. Si el usuario no está conectado, detiene la emisión para ahorrar recursos.
- **Prevención de Eco**: Trabaja con `SentMessageCache` para no reenviar al usuario mensajes que él mismo acaba de escribir desde el dashboard.
- **Gestión de Sesión**: Actualiza automáticamente el estado de "en vivo" del usuario en memoria antes de enviar actualizaciones al cliente.

### 2. `SentMessageCache.ts`

Pequeña memoria temporal para evitar bucles infinitos. Cuando el servidor envía un mensaje a Twitch, guarda el texto brevemente. Cuando Twitch nos avisa del nuevo mensaje vía Webhook, el sistema sabe que es un "eco" y no lo muestra dos veces.

### 3. `encryptionService.ts`

Módulo central de criptografía. Utiliza **AES-256-GCM** para asegurar que los tokens de los streamers nunca se guarden en texto plano. Provee métodos para encriptar, desencriptar y verificar si una cadena ya está protegida.

### 4. `retryWithInterval.ts`

Implementa una lógica de reintentos con espera (backoff). Es vital para llamadas a APIs externas que pueden fallar momentáneamente por red o por límites de tasa.

### 5. `logger.ts`

Configura **Pino**. Diferencia entre la salida "bonita" para terminales de desarrollo y la salida JSON eficiente para servidores de producción.

### 6. `tokenUtils.ts` & `oauth.utils.ts`

Funciones de ayuda para calcular la expiración de tokens, generar URLs de redirección y procesar respuestas de servidores OAuth de forma estandarizada.

## Constantes del Proyecto (`src/constants/`)

### `platforms.ts`

Define el "lenguaje oficial" del servidor sobre qué plataformas existen (`twitch`, `youtube`, `kick`, `tiktok`). Cualquier nueva integración debe registrarse aquí primero.

### `youtube-emotes.ts` & `tiktok-emotes.ts`

Diccionarios de mapeo para los iconos y reacciones de cada plataforma. Durante la normalización del chat, el servidor utiliza estas constantes para transformar códigos internos de las APIs en URLs de imágenes que el frontend pueda renderizar.

## Manejo de Errores Globales (`src/utils/AppError.ts`)

Define la clase `AppError`, que permite al servidor diferenciar entre errores fatales (que deben detener todo) y errores operativos (como "usuario no encontrado"), que solo deben devolver un código 400 o 404 al cliente.