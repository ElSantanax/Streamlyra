<pre style="font-family: monospace; line-height: 1; letter-spacing: 0;">
                     _____ _                            _                     
                    / ____| |                          | |                    
                   | (___ | |_ _ __ ___  __ _ _ __ ___ | |    _   _ _ __ __ _ 
                    \___ \| __| '__/ _ \/ _` | '_ ` _ \| |   | | | | '__/ _` |
                    ____) | |_| | |  __/ (_| | | | | | | |___| |_| | | | (_| |
                   |_____/ \__|_|  \___|\__,_|_| |_| |_|______\__, |_|  \__,_|
                                                               __/ |          
                                                              |___/           
</pre>

<img width="1486" height="836" alt="hero" src="https://github.com/user-attachments/assets/089a943c-4cdf-471b-86ca-d455b30fab03" />

Es una solución moderna para streamers y creadores de contenido que necesitan gestionar múltiples plataformas de streaming simultáneamente. Centraliza todos los chats en una interfaz unificada con capacidades de moderación y análisis en tiempo real.

## Capacidades por Plataforma

| Plataforma  | Leer Chat | Enviar Mensajes | Moderación | Subs & Gifts | Seguidores | Raids | OAuth2 |
| ----------- | :-------: | :-------------: | :--------: | :----------: | :--------: | :---: | :----: |
| **Twitch**  |    ✅     |       ✅        |     ✅     |      ✅      |     ✅     |  ✅   |   ✅   |
| **YouTube** |    ✅     |       ✅        |     ✅     |      ✅      |     ❌     |  ❌   |   ✅   |
| **Kick**    |    ✅     |       ✅        |     ✅     |      ✅      |     ✅     |  ❌   |   ✅   |
| **TikTok**  |    ✅     |       ❌        |     ❌     |      ✅      |     ✅     |  ❌   |   ❌   |

> [!IMPORTANT]
> **Nota sobre Kick**: La API de Kick aún no expone eventos de Raids/Hosting. Se implementará cuando esté disponible.
> **Nota sobre TikTok**: Actualmente en modo solo lectura (listener). Soporta lectura de chat, regalos y follows.
> **Nota sobre YouTube**: La API de YouTube no permite monitorear nuevos suscriptores en tiempo real de manera eficiente sin consumir cuotas excesivas. Solo se notifican "Nuevos Miembros" (Pago).

### ⚡ Twitch Real-Time Followers (Smart Polling)

Como la API de Chat (IRC) de Twitch no envía eventos de "Nuevo Seguidor", Streamlyra implementa un sistema inteligente de **Smart Polling** con las siguientes características:

- **Frecuencia**: 1 Segundo (Ultra Baja Latencia).
- **Seguridad**: Consume solo ~7.5% de la cuota de API permitida por usuario (60 pts/min vs 800 pts/min disponibles).
- **Robustez**: Sistema de **Auto-Refresh** de tokens integrado. Permite sesiones de streaming de duración infinita (24/7) sin cortes por expiración de credenciales.

## 🎨 Sistema de Eventos Unificado

Streamlyra implementa un sistema visual unificado para eventos especiales (alertas) directamente en el chat, eliminando la necesidad de overlays externos complejos para la moderación básica.

| Tipo de Evento        | Indicador Visual        | Color                  | Mensaje en Chat            |
| --------------------- | ----------------------- | ---------------------- | -------------------------- |
| **Follow**            | Borde Lateral Izquierdo | Marca de la Plataforma | **👤 NUEVO SEGUIDOR**      |
| **Suscripción**       | Borde Lateral Izquierdo | Marca de la Plataforma | **🥳 NUEVA SUSCRIPCIÓN**   |
| **Regalo / Sub Gift** | Borde Lateral Izquierdo | Marca de la Plataforma | **🎁 REGALO [Cantidad]**   |
| **Raid / Host**       | Borde Lateral Izquierdo | Marca de la Plataforma | **🚨 RAID [Viewers]**      |
| **Donación / Bits**   | Borde Lateral Izquierdo | Marca de la Plataforma | **💎 DONACIÓN [Cantidad]** |

> **Nota**: Los colores se adaptan automáticamente: Twitch (Violeta), YouTube (Rojo), Kick (Verde Neón), TikTok (Rosa/Rojo).

## Proyecto Open Source

Este es un proyecto de código abierto creado para resolver una necesidad real de la comunidad de streamers. Está diseñado como un espacio de aprendizaje y colaboración donde:

- **Programadores** de todos los niveles pueden contribuir y aprender
- **Diseñadores** pueden mejorar la experiencia de usuario
- **Testers** pueden ayudar a garantizar la calidad del producto
- **Creadores de contenido** pueden sugerir funcionalidades

> [!NOTE]
> **No importa tu nivel de experiencia.** Este proyecto fue creado precisamente para que puedas ver cómo funciona una aplicación real que resuelve un problema concreto, aprender de su arquitectura, y contribuir con tus ideas y habilidades.

## Stack Tecnológico

**Frontend**: 

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white) ![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)


**Backend**:

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white) ![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) ![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101) ![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white) ![Sequelize](https://img.shields.io/badge/Sequelize-52B0E7?style=for-the-badge&logo=Sequelize&logoColor=white)

**Testing**: 

![Vitest](https://img.shields.io/badge/-Vitest-252529?style=for-the-badge&logo=vitest&logoColor=FCC72B) ![Cypress](https://img.shields.io/badge/-cypress-%23E5E5E5?style=for-the-badge&logo=cypress&logoColor=058a5e) ![Jest](https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white)

**Integraciones**: TMI.js (Twitch) · YouTube Data API · TikTok Live Connector · OAuth2

## Inicio Rápido

### Prerrequisitos

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![NPM](https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white)

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

## 🤝 Contribuir

¿Interesado en contribuir a Streamlyra? Revisa nuestra [Guía de Contribución](./CONTRIBUTING.md) para saber cómo puedes participar, sin importar tu nivel de experiencia.

## Documentación Adicional

- [Client README](./client/README.md) - Documentación detallada del frontend
- [Server README](./server/README.md) - Documentación detallada del backend

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](./LICENSE) para más detalles.

---
