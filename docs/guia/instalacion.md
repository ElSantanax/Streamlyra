# Guía de Instalación y Setup Local

Esta guía explica cómo levantar Streamlyra en tu máquina local desde cero.

## Requisitos Previos

Asegúrate de tener instalado:

| Herramienta  | Versión mínima  | Verificar con                  |
| ------------ | --------------- | ------------------------------ |
| Node.js      | 20.x o superior | `node --version`               |
| npm          | 9.x o superior  | `npm --version`                |
| Neon Account | N/A             | [neon.tech](https://neon.tech) |
| Git          | Cualquiera      | `git --version`                |

## 1. Clonar el Repositorio

```bash
git clone https://github.com/ElSantanax/Streamlyra.git
cd Streamlyra
```

## 2. Configuración (.env)

Crea los archivos de configuración en blanco en las carpetas correspondientes:

- **Servidor:** `server/.env`
- **Cliente:** `client/.env.local`

Para obtener las claves de base de datos (Neon), Twitch y YouTube, sigue nuestra:

**[Guía Detallada de Variables de Entorno](/guia/configuracion-variables)**

::: tip IMPORTANTE
Solo necesitas completar las variables de base de datos y secretos (`JWT_SECRET`, `ENCRYPTION_KEY`) para que el sistema logre arrancar inicialmente.
:::

## 3. Instalar Dependencias

```bash
# Instalar dependencias del servidor
cd server && npm install

# Instalar dependencias del cliente
cd ../client && npm install
```

## 4. Iniciar el Servidor

```bash
# Desde la carpeta /server
npm run dev
```

Streamlyra creará automáticamente las tablas en la base de datos en el primer arranque (sincronización de Sequelize en modo `alter`).

Si el arranque fue exitoso, verás en la consola:

```
Base de datos conectada
Servidor HTTP escuchando en puerto 3000
Socket.io inicializado
```

## 5. Iniciar el Cliente

En otra terminal:

```bash
# Desde la carpeta /client
npm run dev
```

El cliente estará disponible en `http://localhost:5173` por defecto.

## Notas de Desarrollo

- **Webhooks en local**: Para recibir webhooks de Twitch/Kick en tu máquina, necesitas exponer el puerto 3000 con una herramienta como [ngrok](https://ngrok.com/) o [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/). Actualiza `SERVER_URL` con la URL generada.
- **YouTube en local**: Las cuotas están desactivadas automáticamente en `NODE_ENV=development`. No necesitas preocuparte por los límites mientras desarrollas.
- **TikTok**: No requiere ninguna credencial de API. Solo necesitas un username válido de TikTok.

## Ejecutar Tests

```bash
# Desde la carpeta /server
npm test

# Con cobertura
npm run test:coverage
```
