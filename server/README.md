# Streamlyra Server

Backend robusto y escalable construido con Node.js, Express y TypeScript para la plataforma de streaming Streamlyra.

## 🚀 Características

- **Streaming multiplataforma** con Twitch, YouTube y Kick
- **WebSocket en tiempo real** con Socket.IO
- **Autenticación OAuth2** para plataformas de streaming
- **Base de datos PostgreSQL** con Sequelize ORM
- **Sistema de webhooks** para eventos en vivo
- **Rate limiting** y protección CSRF
- **Logging estructurado** con Pino
- **Testing completo** con Jest
- **Desarrollo tipo seguro** con TypeScript

## 🛠️ Stack Tecnológico

### Core
- **Node.js** - Runtime JavaScript
- **Express 5** - Framework web minimalista
- **TypeScript** - Desarrollo tipo seguro
- **Socket.IO** - Comunicación en tiempo real

### Base de Datos
- **PostgreSQL** - Base de datos relacional
- **Sequelize** - ORM con TypeScript
- **Sequelize-TypeScript** - Tipado para modelos

### Autenticación & Seguridad
- **JWT** - Tokens de autenticación
- **OAuth2** - Integración con plataformas
- **bcrypt** - Hashing de contraseñas
- **CSRF Protection** - Protección contra ataques
- **Rate Limiting** - Límite de peticiones

### Streaming Platforms
- **TMI.js** - Twitch Chat API
- **TikTok Live Connector** - TikTok streaming
- **Axios** - Cliente HTTP para APIs

### Desarrollo & Testing
- **Jest** - Framework de testing
- **Nodemon** - Desarrollo con hot reload
- **ESLint** - Linting y calidad de código
- **Pino** - Logging estructurado

## 📁 Estructura del Proyecto

```
src/
├── config/             # Configuración de base de datos y app
├── constants/          # Constantes de la aplicación
├── controllers/        # Controladores Express
├── dtos/               # Data Transfer Objects
├── middleware/         # Middleware Express
├── models/             # Modelos Sequelize
├── repositories/       # Patrones de repositorio
├── routes/             # Definición de rutas
├── services/           # Lógica de negocio
│   ├── platforms/      # Servicios de plataformas
│   ├── connection/     # Gestión de conexiones
│   ├── message/        # Envío de mensajes
│   └── webhook/        # Procesamiento de webhooks
├── socket/             # Handlers de Socket.IO
├── types/              # Definiciones TypeScript
├── utils/              # Funciones helper
├── index.ts            # Punto de entrada
└── server.ts           # Configuración del servidor
```

## 🚀 Comenzando

### Prerrequisitos
- Node.js 18+
- PostgreSQL 13+
- npm o yarn

### Instalación
```bash
npm install
```

### Configuración de Variables de Entorno
Copia el archivo de ejemplo y configura tus credenciales:

```bash
cp .env.example .env
```

Edita `.env` con tus configuraciones:

```env
# Servidor
PORT=4000

# JWT
JWT_SECRET=super_secreto_aleatorio_de_64_caracteres_123456

# Base de datos
DATABASE_URL=postgresql://usuario:password@host:puerto/database

# Twitch
TWITCH_CLIENT_ID=tu_client_id
TWITCH_CLIENT_SECRET=tu_client_secret
TWITCH_REDIRECT_URI=http://localhost:4000/auth/twitch/callback

# YouTube
YOUTUBE_CLIENT_ID=tu_client_id
YOUTUBE_CLIENT_SECRET=tu_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:4000/auth/youtube/callback

# Kick
KICK_CLIENT_ID=tu_client_id
KICK_CLIENT_SECRET=tu_client_secret
KICK_REDIRECT_URI=http://localhost:4000/auth/kick/callback

# Webhooks
APP_URL=https://tu-dominio.com
KICK_WEBHOOK_SKIP_SIGNATURE=false

# Encriptación
ENCRYPTION_KEY=64cadf6d90a13d9675306660163359392e2726359e19d5c4114f8670150d603e
```

### Scripts Disponibles

#### Desarrollo
```bash
npm run dev          # Iniciar servidor en modo desarrollo
npm run build        # Compilar TypeScript
npm run build:clean  # Limpiar y compilar
npm run start        # Iniciar servidor de producción
```

#### Testing
```bash
npm run test         # Ejecutar tests
npm run test:watch   # Tests en modo watch
npm run test:coverage # Reporte de cobertura
```

#### Calidad
```bash
npm run lint         # Ejecutar ESLint
npm run clean        # Limpiar directorio dist
```

## 🏗️ Arquitectura

### Patrones de Diseño
- **Repository Pattern**: Abstracción de acceso a datos
- **Dependency Injection**: Inyección de dependencias
- **Service Layer**: Separación de lógica de negocio
- **Controller Pattern**: Manejo de peticiones HTTP

### Flujo de Autenticación
1. **OAuth Flow**: Conexión con plataformas (Twitch, YouTube, Kick)
2. **JWT Tokens**: Generación de tokens de sesión
3. **CSRF Protection**: Validación de peticiones
4. **Rate Limiting**: Protección contra abusos

### Sistema de Streaming
- **Chat Manager**: Gestión centralizada de chats
- **Platform Services**: Adaptadores para cada plataforma
- **Message Sender**: Envío unificado de mensajes
- **Activity Service**: Monitoreo de actividad

### Webhooks
- **Event Processing**: Procesamiento de eventos en vivo
- **Signature Verification**: Validación de webhooks
- **Real-time Updates**: Actualizaciones vía WebSocket

## 🔌 Endpoints API

### Autenticación
- `POST /api/auth/twitch` - Iniciar OAuth con Twitch
- `POST /api/auth/youtube` - Iniciar OAuth con YouTube
- `POST /api/auth/kick` - Iniciar OAuth con Kick
- `GET /api/auth/callback` - Callback OAuth

### Webhooks
- `POST /api/webhooks/twitch` - Webhook de Twitch
- `POST /api/webhooks/youtube` - Webhook de YouTube
- `POST /api/webhooks/kick` - Webhook de Kick

### Sistema
- `GET /api/status` - Estado del servidor
- `GET /` - Health check

## 🌐 WebSocket Events

### Cliente → Servidor
- `join_room` - Unirse a sala de chat
- `leave_room` - Abandonar sala
- `send_message` - Enviar mensaje

### Servidor → Cliente
- `message` - Nuevo mensaje recibido
- `user_joined` - Usuario se unió
- `user_left` - Usuario abandonó
- `platform_status` - Estado de plataforma

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

## 🔧 Configuración Avanzada

### Base de Datos
El servidor utiliza Sequelize con PostgreSQL:
- **Migrations**: Gestión de esquema
- **Seeders**: Datos iniciales
- **Models**: Tipado con TypeScript

### Logging
Sistema de logging estructurado con Pino:
- **Niveles**: error, warn, info, debug
- **Metadatos**: Contexto en cada log
- **Pretty Print**: Formato legible en desarrollo

### Seguridad
- **CORS**: Configuración de orígenes permitidos
- **Rate Limiting**: Límites por endpoint
- **CSRF**: Tokens de protección
- **Input Validation**: Validación con Zod

## 🚀 Despliegue

### Producción
```bash
npm run build:clean
npm run start
```

### Variables de Entorno de Producción
- `NODE_ENV=production`
- Configurar `APP_URL` con dominio real
- Deshabilitar `KICK_WEBHOOK_SKIP_SIGNATURE`

### Docker (Opcional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["npm", "start"]
```

## 📈 Monitoreo

### Logs
- **Estructurados**: JSON con metadatos
- **Niveles**: error, warn, info, debug
- **Context**: Request ID y tracing

### Métricas
- **Conexiones activas**: WebSocket
- **Mensajes procesados**: Por plataforma
- **Errores**: Por tipo y endpoint

## 🤝 Contribuir

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/amazing-feature`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push a la branch (`git push origin feature/amazing-feature`)
5. Abrir Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.
