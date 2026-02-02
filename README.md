# Streamlyra

Plataforma de streaming multiplataforma que unifica chats de Twitch, YouTube, TikTok y Kick en una sola interfaz en tiempo real.

## 🚀 Visión del Proyecto

Streamlyra es una solución moderna para streamers y creadores de contenido que necesitan gestionar múltiples plataformas de streaming simultáneamente. Centraliza todos los chats en una interfaz unificada con capacidades de moderación y análisis en tiempo real.

## ✨ Características Principales

### 🎥 Streaming Multiplataforma
- **Twitch** - Chat y eventos en vivo
- **YouTube** - Comentarios de streams y videos
- **TikTok** - Chat en vivo (solo lectura)
- **Kick** - Chat y eventos de streaming

### 💬 Gestión Unificada
- **Chat centralizado** en tiempo real
- **Moderación** desde una única interfaz
- **Notificaciones** instantáneas de eventos
- **Historial** de mensajes persistente

### 🔐 Autenticación Segura
- **OAuth2** nativo con cada plataforma
- **JWT tokens** para sesión de usuario
- **CSRF protection** y rate limiting
- **Credenciales encriptadas** en base de datos

### 📊 Análisis y Monitoreo
- **Activity tracking** en tiempo real
- **Métricas** de engagement
- **Dashboard** con estadísticas
- **Webhooks** para eventos externos

## 🏗️ Arquitectura del Proyecto

```
Streamlyra/
├── client/                 # Frontend React + TypeScript
│   ├── src/
│   │   ├── components/     # Componentes UI
│   │   ├── pages/          # Páginas principales
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # Servicios de API
│   │   └── socket/         # Client Socket.IO
│   ├── package.json
│   └── README.md
├── server/                 # Backend Node.js + Express
│   ├── src/
│   │   ├── controllers/    # Controladores API
│   │   ├── services/       # Lógica de negocio
│   │   ├── models/         # Modelos Sequelize
│   │   ├── socket/         # Handlers WebSocket
│   │   └── routes/         # Definición de rutas
│   ├── package.json
│   └── README.md
├── .gitignore              # Ignorados de Git
└── README.md               # Este archivo
```

## 🛠️ Stack Tecnológico

### Frontend (Client)
- **React 19** - UI library con hooks modernos
- **TypeScript** - Desarrollo tipo seguro
- **Vite** - Build tool ultra rápido
- **Tailwind CSS 4** - Framework CSS utility-first
- **Socket.IO Client** - Comunicación en tiempo real
- **React Router** - Gestión de rutas
- **Vitest + Cypress** - Testing completo

### Backend (Server)
- **Node.js** - Runtime JavaScript
- **Express 5** - Framework web minimalista
- **TypeScript** - Desarrollo tipo seguro
- **Socket.IO** - Servidor WebSocket
- **PostgreSQL** - Base de datos relacional
- **Sequelize** - ORM con TypeScript
- **JWT** - Autenticación de usuarios
- **Jest** - Framework de testing

### Integraciones
- **TMI.js** - Twitch Chat API
- **TikTok Live Connector** - Streaming de TikTok
- **OAuth2** - Autenticación con plataformas
- **Webhooks** - Eventos en tiempo real

## 🚀 Comenzando

### Prerrequisitos
- Node.js 18+
- PostgreSQL 13+
- npm o yarn

### Instalación Rápida

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd Streamlyra
```

2. **Instalar dependencias**
```bash
# Cliente
cd client
npm install

# Servidor
cd ../server
npm install
```

3. **Configurar variables de entorno**
```bash
# Servidor
cd server
cp .env.example .env
# Editar .env con tus credenciales
```

4. **Iniciar desarrollo**
```bash
# Terminal 1 - Servidor
cd server
npm run dev

# Terminal 2 - Cliente
cd client
npm run dev
```

### Acceso a la Aplicación
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **API Status**: http://localhost:4000/api/status

## 📋 Configuración de Plataformas

### Twitch
1. Crear aplicación en [Twitch Developers](https://dev.twitch.tv/)
2. Obtener Client ID y Client Secret
3. Configurar Redirect URI: `http://localhost:4000/auth/twitch/callback`

### YouTube
1. Crear proyecto en [Google Cloud Console](https://console.cloud.google.com/)
2. Habilitar YouTube Data API
3. Crear credenciales OAuth2
4. Configurar Redirect URI: `http://localhost:4000/auth/youtube/callback`

### Kick
1. Solicitar acceso a [Kick Developers](https://developers.kick.com/)
2. Crear aplicación y obtener credenciales
3. Configurar Redirect URI: `http://localhost:4000/auth/kick/callback`

### TikTok
1. Actualmente en modo solo lectura
2. Plan de integración con API oficial en progreso
3. Ver `TIKTOK_VALIDATION_PLAN.md` para detalles

## 🧪 Testing

### Frontend Tests
```bash
cd client
npm run test              # Unit tests
npm run test:coverage     # Coverage report
npm run e2e              # E2E tests con Cypress
```

### Backend Tests
```bash
cd server
npm run test              # Unit tests
npm run test:coverage     # Coverage report
npm run test:watch        # Watch mode
```

## 📚 Documentación

- **[Client README](./client/README.md)** - Documentación del frontend
- **[Server README](./server/README.md)** - Documentación del backend
- **[TikTok Validation Plan](./TIKTOK_VALIDATION_PLAN.md)** - Plan de integración TikTok

## 🚀 Despliegue

### Desarrollo
```bash
# Servidor
cd server && npm run dev

# Cliente
cd client && npm run dev
```

### Producción
```bash
# Build del servidor
cd server && npm run build:clean && npm start

# Build del cliente
cd client && npm run build
# Servir archivos estáticos con nginx o similar
```

### Variables de Entorno de Producción
```env
NODE_ENV=production
# Configurar dominios reales en lugar de localhost
# Deshabilitar opciones de desarrollo
# Configurar webhooks con HTTPS
```

## 🔧 Flujo de Trabajo de Desarrollo

### 1. Configuración Inicial
- Clonar repositorio
- Instalar dependencias en ambos directorios
- Configurar variables de entorno

### 2. Desarrollo
- Servidor en puerto 4000
- Cliente en puerto 5173
- Hot reload en ambos proyectos

### 3. Testing
- Unit tests en ambos proyectos
- E2E tests para flujo completo
- Coverage reports para calidad

### 4. Deploy
- Build de producción
- Configuración de dominios
- Setup de webhooks

## 🤝 Contribuir

### Guía de Contribución
1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/amazing-feature`)
3. Hacer cambios en cliente y/o servidor según corresponda
4. Commit con mensajes descriptivos
5. Push y crear Pull Request

### Estándares de Código
- **TypeScript** obligatorio en ambos proyectos
- **ESLint** configurado y respetado
- **Tests** para nuevas funcionalidades
- **Documentación** actualizada

### Estructura de Commits
```
type(scope): description

feat(client): add new chat component
fix(server): resolve webhook authentication
docs(readme): update deployment guide
```

## 📈 Roadmap

### v1.0 - MVP (Actual)
- [x] Conexión básica con Twitch
- [x] Chat unificado en tiempo real
- [x] Autenticación OAuth2
- [x] Interfaz React moderna

### v1.1 - Próximo
- [ ] Integración completa YouTube
- [ ] Sistema de moderación
- [ ] Dashboard de analytics
- [ ] Mobile responsive

### v2.0 - Futuro
- [ ] API oficial TikTok
- [ ] Sistema de notificaciones
- [ ] Integración Discord
- [ ] Multi-idioma

## 🐛 Problemas Conocidos

### TikTok
- Actualmente solo lectura
- Validación de cuenta pendiente
- Ver plan de validación para soluciones

### Rate Limiting
- Algunas plataformas tienen límites estrictos
- Implementado rate limiting en backend
- Monitoreo activo de límites

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.

## 👥 Equipo

- **José Santana** - Lead Developer

---

**Streamlyra** - Unifica tu streaming, multiplica tu impacto.
