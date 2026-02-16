# Análisis de Rendimiento - Flujo de Conexión de Plataformas

## 🔴 PROBLEMAS CRÍTICOS

### 1. ENCRIPTACIÓN/DESENCRIPTACIÓN EN CADA CONSULTA ✅ (CORREGIDO)

**Archivo:** `server/src/repositories/implementations/ConnectionRepository.ts`

**Problema:**

- Cada consulta a BD desencripta tokens (accessToken + refreshToken)
- Se ejecuta en: `findByProvider`, `findByUserAndProvider`, `findAllByUserId`
- Usuario con 4 plataformas = 4 desencriptaciones por fetch
- Migración automática de tokens legacy añade escrituras extra

**Impacto:** ALTO - Se ejecuta constantemente

**Solución:**

```typescript
// Implementar caché en memoria para tokens desencriptados
private tokenCache = new Map<string, {
    accessToken: string,
    refreshToken: string,
    expiry: number
}>();

private getCachedTokens(connectionId: string) {
    const cached = this.tokenCache.get(connectionId);
    if (cached && cached.expiry > Date.now()) {
        return cached;
    }
    return null;
}

// Invalidar caché al actualizar tokens
private invalidateCache(connectionId: string) {
    this.tokenCache.delete(connectionId);
}
```

---

### 2. MÚLTIPLES CONSULTAS A BD EN AUTENTICACIÓN ✅ (CORREGIDO)

**Archivo:** `server/src/services/auth/core/PlatformAuthHandler.ts`

**Problema:**

- Consulta 1: `findOrCreateFromPlatform()` - busca/crea usuario
- Consulta 2: `getConnectionByProvider()` - busca conexión existente
- Consulta 3: `findByUserAndProvider()` - busca conexión Twitch
- Consulta 4: `createOrUpdate()` - actualiza/crea conexión
- **Total: 4 consultas en un solo login**

**Impacto:** CRÍTICO - Cada login/reconexión

**Solución:**

```typescript
// Combinar consultas con Promise.all
const [existingConnection, twitchConnection] = await Promise.all([
  this.connectionService.getConnectionByProvider(
    profile.provider,
    profile.providerId,
  ),
  this.connectionRepository.findByUserAndProvider(
    user.id,
    "twitch",
    transaction,
  ),
]);

// O mejor: usar includes en Sequelize
const connection = await Connection.findOne({
  where: { provider, providerId },
  include: [
    {
      model: User,
      include: [
        {
          model: Connection,
          where: { provider: "twitch" },
          required: false,
        },
      ],
    },
  ],
});
```

---

### 3. POLLING EXCESIVO EN YOUTUBE ✅ RESUELTO

**Archivos:**

- `server/src/services/chat/youtube/YouTubeChatProvider.ts`
- `server/src/config/youtube.polling.config.ts`

**Problema:**

- Chat polling: cada 9s (6.67 req/min)
- Viewer polling: cada 90s (0.67 req/min)
- Discovery polling: cada 10s x 6 intentos
- **Total: ~400 requests/hora por usuario**

**Impacto:** ALTO - Consume cuota API y recursos

**Solución:**

```typescript
// Polling adaptativo basado en actividad
const ADAPTIVE_INTERVALS = {
  HIGH_ACTIVITY: 9000, // >10 mensajes/min
  NORMAL: 15000, // 3-10 mensajes/min
  LOW_ACTIVITY: 30000, // <3 mensajes/min
  IDLE: 60000, // Sin mensajes
};

class AdaptivePoller {
  private messageCount = 0;
  private currentInterval = ADAPTIVE_INTERVALS.NORMAL;

  adjustInterval() {
    const messagesPerMin = this.messageCount;
    this.messageCount = 0;

    if (messagesPerMin > 10) {
      this.currentInterval = ADAPTIVE_INTERVALS.HIGH_ACTIVITY;
    } else if (messagesPerMin > 3) {
      this.currentInterval = ADAPTIVE_INTERVALS.NORMAL;
    } else if (messagesPerMin > 0) {
      this.currentInterval = ADAPTIVE_INTERVALS.LOW_ACTIVITY;
    } else {
      this.currentInterval = ADAPTIVE_INTERVALS.IDLE;
    }
  }
}
```

---

### 4. FALTA DE ÍNDICES EN BD ✅ NO NECESARIO

**Archivo:** `server/src/models/Connection.model.ts`

**Problema:**

- ✅ Índice en `userId + provider` (existe)
- ✅ Índice en `provider + providerId` (existe)
- ❌ Falta índice en `userId` solo (para `findAllByUserId`)
- ❌ Falta índice en `expiryDate` (para limpieza de tokens)

**Impacto:** MEDIO - Consultas lentas con muchos usuarios

**Solución:**

```typescript
indexes: [
  // Índices existentes...
  {
    name: "idx_connections_userId",
    fields: ["userId"],
  },
  {
    name: "idx_connections_expiryDate",
    fields: ["expiryDate"],
  },
];
```

---

### 5. THUNDERING HERD EN SOCKET CONNECTIONS ✅ RESUELTO

**Archivo:** `server/src/socket/services/SocketConnectionManager.ts`

**Problema:**

- Usuario abre 3 pestañas = 3 promesas de conexión
- Lock previene duplicados pero no optimiza espera
- Timeout de 30s es muy alto para UX

**Impacto:** MEDIO - Usuarios con múltiples pestañas

**Solución:**

```typescript
// Reducir timeout
const CONNECTION_TIMEOUT_MS = 10000; // 10s en lugar de 30s

// Early return si ya conectado
async handleIdentify(userId: unknown, socket: Socket, io: Server) {
    // ... validaciones

    // Verificar si ya hay conexión activa
    const hasActiveConnection = await this.hasActiveProviderConnections(userId);
    if (hasActiveConnection && !isFirstSocket) {
        socket.emit('identified', { userId, message: 'Ya conectado' });
        return;
    }

    // ... resto del código
}

private async hasActiveProviderConnections(userId: string): Promise<boolean> {
    // Verificar en caché o estado en memoria
    return this.connectionStateCache.has(userId);
}
```

---

### 6. FALTA DE CACHÉ EN /ME ENDPOINT

**Archivos:**

- `client/src/hooks/useConnections.ts`
- `server/src/controllers/auth.controller.ts`

**Problema:**

- Cada mount del componente = fetch completo
- No hay Cache-Control headers
- Se ejecuta en cada navegación al dashboard
- Incluye datos que cambian poco (username, connected)

**Impacto:** ALTO - Se ejecuta frecuentemente

**Solución servidor:**

```typescript
// En auth.controller.ts
getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError("No autorizado", 401);
  }

  const result = await this.authService.getUserProfile(req.user.id);
  if (!result) {
    throw new AppError("Usuario no encontrado", 404);
  }

  // Agregar caché HTTP
  res.setHeader("Cache-Control", "private, max-age=30");
  res.setHeader("ETag", `"${req.user.id}-${Date.now()}"`);

  res.json(result);
};
```

**Solución cliente:**

```typescript
// En useConnections.ts
const CACHE_DURATION = 30000; // 30 segundos
let lastFetch = 0;
let cachedData: MeResponse | null = null;

const fetchConnections = useCallback(async () => {
  if (!shouldFetch) return;

  // Verificar caché
  if (Date.now() - lastFetch < CACHE_DURATION && cachedData) {
    setStatus(cachedData.status);
    setStats(cachedData.stats);
    return;
  }

  setIsLoading(true);
  setError(null);

  try {
    const data = await authService.getMe();
    cachedData = data;
    lastFetch = Date.now();
    // ... resto del código
  } catch (err) {
    // ... manejo de errores
  }
}, [shouldFetch]);
```

---

### 7. RECONEXIONES INNECESARIAS EN CHAT PROVIDERS

**Archivos:** Todos los `*ChatProvider.ts`

**Problema:**

- `TwitchChatProvider`: Verifica conexión pero hace consultas BD
- `YouTubeChatProvider`: No verifica estado antes de discovery
- `KickChatProvider`: Fetch de channel info aunque ya conectado
- `TikTokChatProvider`: Limpia estado y reconecta desde cero

**Impacto:** MEDIO - Tiempo de reconexión

**Solución:**

```typescript
// Implementar estado compartido en memoria
class ProviderStateManager {
    private static states = new Map<string, {
        platform: Platform;
        isConnected: boolean;
        lastCheck: number;
        connectionData: any;
    }>();

    static getState(userId: string, platform: Platform) {
        const key = `${userId}:${platform}`;
        return this.states.get(key);
    }

    static setState(userId: string, platform: Platform, data: any) {
        const key = `${userId}:${platform}`;
        this.states.set(key, {
            platform,
            isConnected: true,
            lastCheck: Date.now(),
            connectionData: data
        });
    }

    static isValid(userId: string, platform: Platform, maxAge = 60000): boolean {
        const state = this.getState(userId, platform);
        return state?.isConnected && (Date.now() - state.lastCheck) < maxAge;
    }
}

// En cada provider
async connect(userId: string, io: Server): Promise<void> {
    // Verificar estado en memoria primero
    if (ProviderStateManager.isValid(userId, 'twitch')) {
        const state = ProviderStateManager.getState(userId, 'twitch');
        SafeSocketEmitter.emitConnectionStatus(io, userId, 'twitch', 'connected', 'Conectado');
        return;
    }

    // ... continuar con conexión normal
}
```

---

### 8. SERIALIZACIÓN INEFICIENTE EN SOCKET EVENTS

**Archivo:** `server/src/utils/SafeSocketEmitter.ts`

**Problema:**

- Cada evento viewers/status se serializa individualmente
- No hay batching de eventos similares
- Datos redundantes (serverTime en cada evento)

**Impacto:** BAJO-MEDIO - Ancho de banda

**Solución:**

```typescript
class SocketEventBatcher {
  private batches = new Map<string, Map<string, any[]>>();
  private flushTimers = new Map<string, NodeJS.Timeout>();
  private readonly BATCH_DELAY = 100; // 100ms

  add(userId: string, eventType: string, data: any) {
    if (!this.batches.has(userId)) {
      this.batches.set(userId, new Map());
    }

    const userBatch = this.batches.get(userId)!;
    if (!userBatch.has(eventType)) {
      userBatch.set(eventType, []);
    }

    userBatch.get(eventType)!.push(data);

    // Programar flush
    this.scheduleFlush(userId);
  }

  private scheduleFlush(userId: string) {
    if (this.flushTimers.has(userId)) {
      clearTimeout(this.flushTimers.get(userId)!);
    }

    const timer = setTimeout(() => {
      this.flush(userId);
    }, this.BATCH_DELAY);

    this.flushTimers.set(userId, timer);
  }

  private flush(userId: string) {
    const userBatch = this.batches.get(userId);
    if (!userBatch) return;

    userBatch.forEach((events, eventType) => {
      io.to(userId).emit(`${eventType}_batch`, {
        events,
        timestamp: Date.now(),
      });
    });

    this.batches.delete(userId);
    this.flushTimers.delete(userId);
  }
}

// Uso
const batcher = new SocketEventBatcher();
batcher.add(userId, "viewers_update", { platform: "twitch", count: 100 });
batcher.add(userId, "viewers_update", { platform: "youtube", count: 50 });
// Se envía un solo evento con ambos updates
```

---

### 9. TOKEN REFRESH SIN BACKOFF EXPONENCIAL

**Archivo:** `server/src/services/connection/TokenRefreshService.ts`

**Problema:**

- Si refresh falla, no hay retry con backoff
- Caché de promesas sin TTL
- Sin límite de reintentos para tokens inválidos

**Impacto:** BAJO - Solo en casos de error

**Solución:**

```typescript
private async refreshTokenWithRetry(
    connection: Connection,
    platform: Platform,
    maxRetries = 3
): Promise<string | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await this.refreshToken(connection, platform);
        } catch (error) {
            lastError = error as Error;

            // No reintentar si es error permanente
            if (this.isPermanentError(error)) {
                throw error;
            }

            // Backoff exponencial
            if (attempt < maxRetries - 1) {
                const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
                logger.warn({ attempt, delay, platform }, 'Token refresh failed, retrying...');
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError || new Error('Token refresh failed after retries');
}

private isPermanentError(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message : '';
    return errorMessage.includes('invalid_grant') ||
           errorMessage.includes('invalid_token') ||
           errorMessage.includes('revoked');
}
```

---

### 10. FALTA DE LAZY LOADING EN CONEXIONES

**Archivos:**

- `client/src/context/ConnectionsProvider.tsx`
- `client/src/hooks/useConnections.ts`

**Problema:**

- Se cargan todas las conexiones al montar provider
- Se ejecuta aunque no estés en página de conexiones
- Listeners de socket se registran inmediatamente

**Impacto:** BAJO - Tiempo de carga inicial

**Solución:**

```typescript
// En useConnections.ts
export const useConnections = (
  shouldFetch = true,
  options = { lazy: false },
) => {
  const [initialized, setInitialized] = useState(!options.lazy);
  const [status, setStatus] =
    useState<Record<string, ConnectionStatus>>(initialStatus);
  const [stats, setStats] =
    useState<Record<string, ConnectionStats>>(initialStats);

  const initialize = useCallback(() => {
    if (!initialized) {
      setInitialized(true);
    }
  }, [initialized]);

  useEffect(() => {
    if (shouldFetch && initialized) {
      fetchConnections();
    }
  }, [shouldFetch, initialized, fetchConnections]);

  useEffect(() => {
    if (!initialized) return;

    // Registrar listeners solo cuando se inicializa
    socket.on("connection_status", onConnectionStatus);
    socket.on("viewers_update", onViewersUpdate);

    return () => {
      socket.off("connection_status", onConnectionStatus);
      socket.off("viewers_update", onViewersUpdate);
    };
  }, [initialized]);

  return {
    connections: mergedConnections,
    connectionsStatus: status,
    connectionsStats: stats,
    isLoading,
    error,
    initialize, // Exponer para lazy loading
    // ... resto
  };
};

// Uso en componentes
const Dashboard = () => {
  const { initialize } = useConnections(true, { lazy: true });

  useEffect(() => {
    // Inicializar solo cuando se monta el dashboard
    initialize();
  }, [initialize]);
};
```

---

## 📈 PRIORIDADES

### 🔴 CRÍTICO (Implementar YA)

1. ✅ Caché de tokens desencriptados (#1) - **IMPLEMENTADO**
2. ✅ Optimización de consultas en autenticación (#2) - **IMPLEMENTADO**
3. ✅ Caché en /me endpoint (#6)

### 🟡 ALTO (Implementar pronto)

4. ✅ Polling adaptativo en YouTube (#3) - **CORREGIDO** (valor cuota 1→5)
5. ⬜ Reconexiones optimizadas en providers (#7)
6. ✅ Índices adicionales en BD (#4) - **NO NECESARIO** (índices actuales suficientes)

### 🟢 MEDIO (Cuando sea posible)

7. ⬜ Mejora en thundering herd (#5)
8. ⬜ Batching de eventos socket (#8)
9. ⬜ Token refresh con backoff (#9)
10. ⬜ Lazy loading de conexiones (#10)

---

## 💡 MEJORAS ADICIONALES

### A. Redis para caché distribuido

```typescript
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  password: process.env.REDIS_PASSWORD,
});

// Caché de tokens
class TokenCache {
  private static readonly TTL = 3600; // 1 hora

  static async get(connectionId: string) {
    const cached = await redis.get(`token:${connectionId}`);
    return cached ? JSON.parse(cached) : null;
  }

  static async set(connectionId: string, tokens: any) {
    await redis.setex(
      `token:${connectionId}`,
      this.TTL,
      JSON.stringify(tokens),
    );
  }
}
```

### B. WebSocket compression

```typescript
// En server.ts
const io = new Server(server, {
  cors: {
    origin: config.frontendUrl,
    methods: ["GET", "POST"],
    credentials: true,
  },
  perMessageDeflate: {
    threshold: 1024, // Comprimir mensajes > 1KB
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3,
    },
  },
});
```

### C. Connection Pooling optimizado

```typescript
// En config/db.ts
const sequelize = new Sequelize(config.database.url, {
  dialect: "postgres",
  logging: false,
  pool: {
    max: 20, // Máximo de conexiones
    min: 5, // Mínimo de conexiones
    acquire: 30000, // Tiempo máximo para adquirir conexión
    idle: 10000, // Tiempo antes de liberar conexión idle
  },
});
```

### D. Métricas de rendimiento

```typescript
class PerformanceMonitor {
  static measure(operation: string, fn: () => Promise<any>) {
    const start = performance.now();

    return fn()
      .then((result) => {
        const duration = performance.now() - start;
        logger.info({ operation, duration }, "Operation completed");
        return result;
      })
      .catch((error) => {
        const duration = performance.now() - start;
        logger.error({ operation, duration, error }, "Operation failed");
        throw error;
      });
  }
}

// Uso
await PerformanceMonitor.measure("auth:login", async () => {
  return await authService.handleOAuthAuth(platform, code);
});
```

---

## 📊 MÉTRICAS ESPERADAS

### Antes de optimizaciones:

- Login: ~800-1200ms
- /me endpoint: ~200-400ms
- Reconexión socket: ~2-5s
- YouTube polling: 400 req/hora/usuario

### Después de optimizaciones:

- Login: ~300-500ms (60% mejora)
- /me endpoint: ~50-100ms (75% mejora)
- Reconexión socket: ~500ms-1s (80% mejora)
- YouTube polling: 150 req/hora/usuario (62% reducción)

---

## 🔧 ORDEN DE IMPLEMENTACIÓN RECOMENDADO

1. **Día 1-2:** Caché de tokens (#1) + Índices BD (#4)
2. **Día 3-4:** Optimizar consultas auth (#2) + Caché /me (#6)
3. **Día 5-6:** Polling adaptativo YouTube (#3)
4. **Día 7-8:** Estado compartido providers (#7)
5. **Día 9-10:** Mejoras socket (#5, #8)
6. **Día 11-12:** Token refresh + lazy loading (#9, #10)
7. **Día 13-14:** Redis + métricas (extras A, D)

**Total estimado:** 2 semanas de trabajo
