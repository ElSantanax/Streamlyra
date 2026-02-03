# Streamlyra

Streamlyra es una solución moderna para streamers y creadores de contenido que necesitan gestionar múltiples plataformas de streaming simultáneamente. Centraliza todos los chats en una interfaz unificada con capacidades de moderación y análisis en tiempo real.

## Capacidades por Plataforma

| Plataforma | Leer Chat | Enviar Mensajes | Moderación | Subs & Gifts | Raids | OAuth2 |
|------------|:---------:|:---------------:|:----------:|:------------:|:-----:|:------:|
| **Twitch** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **YouTube** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Kick** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **TikTok** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

> [!IMPORTANT]
> **Nota sobre Kick**: La API de Kick aún no expone eventos de Raids/Hosting. Se implementará cuando esté disponible.
> **Nota sobre TikTok**: Actualmente en modo solo lectura. La integración completa con la API oficial está en desarrollo. Ver [TIKTOK_VALIDATION_PLAN.md](./TIKTOK_VALIDATION_PLAN.md) para más detalles.

## Proyecto Open Source

Este es un proyecto de código abierto creado para resolver una necesidad real de la comunidad de streamers. Está diseñado como un espacio de aprendizaje y colaboración donde:

- **Programadores** de todos los niveles pueden contribuir y aprender
- **Diseñadores** pueden mejorar la experiencia de usuario
- **Testers** pueden ayudar a garantizar la calidad del producto
- **Creadores de contenido** pueden sugerir funcionalidades

> [!NOTE]
> **No importa tu nivel de experiencia.** Este proyecto fue creado precisamente para que puedas ver cómo funciona una aplicación real que resuelve un problema concreto, aprender de su arquitectura, y contribuir con tus ideas y habilidades.

## Stack Tecnológico

**Frontend**: React 19 · TypeScript · Vite · Tailwind CSS 4 · Socket.IO Client

**Backend**: Node.js · Express 5 · TypeScript · Socket.IO · PostgreSQL · Sequelize

**Testing**: Vitest · Cypress · Jest

**Integraciones**: TMI.js (Twitch) · YouTube Data API · TikTok Live Connector · OAuth2

## Inicio Rápido

### Prerrequisitos
- Node.js 18+
- PostgreSQL 13+
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd Streamlyra

# Instalar dependencias del cliente
cd client && npm install

# Instalar dependencias del servidor
cd ../server && npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de plataformas
```

### Desarrollo

```bash
# Terminal 1 - Servidor (puerto 4000)
cd server && npm run dev

# Terminal 2 - Cliente (puerto 5173)
cd client && npm run dev
```

Accede a la aplicación en `http://localhost:5173`

## Cómo Contribuir

Todas las contribuciones son bienvenidas, sin importar tu nivel de experiencia. Aquí hay algunas formas de participar:

### Para Programadores
- Revisa los [issues abiertos](../../issues) y elige uno que te interese
- Mejora la documentación del código
- Optimiza el rendimiento
- Agrega tests para aumentar la cobertura
- Implementa nuevas funcionalidades

### Para Diseñadores
- Mejora la interfaz de usuario
- Crea mockups para nuevas funcionalidades
- Optimiza la experiencia móvil
- Diseña iconos y recursos visuales

### Para Testers
- Reporta bugs con pasos detallados para reproducirlos
- Prueba la aplicación en diferentes navegadores
- Valida el comportamiento en casos extremos
- Sugiere mejoras en la usabilidad

### Proceso de Contribución

1. Fork el proyecto
2. Crea una rama para tu funcionalidad (`git checkout -b feature/nueva-funcionalidad`)
3. Haz commit de tus cambios (`git commit -m 'feat: agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Documentación Adicional

- [Client README](./client/README.md) - Documentación detallada del frontend
- [Server README](./server/README.md) - Documentación detallada del backend
- [TikTok Validation Plan](./TIKTOK_VALIDATION_PLAN.md) - Plan de integración con TikTok

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](./LICENSE) para más detalles.

---
