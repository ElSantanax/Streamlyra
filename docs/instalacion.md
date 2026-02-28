# Guía de Instalación y Setup Local

Esta guía explica cómo levantar Streamlyra en tu máquina local desde cero.

## Requisitos Previos

Asegúrate de tener instalado:

| Herramienta | Versión mínima  | Verificar con    |
| ----------- | --------------- | ---------------- |
| Node.js     | 20.x o superior | `node --version` |
| npm         | 9.x o superior  | `npm --version`  |
| PostgreSQL  | 14.x o superior | `psql --version` |
| Git         | Cualquiera      | `git --version`  |

---

## 1. Clonar el Repositorio

```bash
git clone https://github.com/ElSantanax/Streamlyra.git
cd Streamlyra
```

---

## 2. Configurar la Base de Datos

Crea una base de datos PostgreSQL para el proyecto:

```bash
psql -U postgres
CREATE DATABASE streamlyra_db;
CREATE USER streamlyra_user WITH PASSWORD 'tu_password_segura';
GRANT ALL PRIVILEGES ON DATABASE streamlyra_db TO streamlyra_user;
\q
```

---

## 3. Variables de Entorno

Copia el archivo de ejemplo y complétalo:

```bash
cp server/.env.example server/.env
```

Abre `server/.env` y configura al mínimo estas variables para poder arrancar:

```bash
# Base de Datos
DATABASE_URL=postgresql://streamlyra_user:tu_password@localhost:5432/streamlyra_db

# Secretos (genera valores aleatorios seguros)
JWT_SECRET=un_string_muy_largo_y_aleatorio
ENCRYPTION_KEY=un_string_de_exactamente_64_caracteres_hexadecimales_aqui_ok

# Entorno
NODE_ENV=development
PORT=3000

# URL pública del servidor (para webhooks)
SERVER_URL=http://localhost:3000
```

> Consulta la página de [Variables de Entorno](/configuracion-variables) para la lista completa con explicaciones de cada variable de cada plataforma.

---

## 4. Instalar Dependencias

```bash
# Instalar dependencias del servidor
cd server && npm install

# Instalar dependencias del cliente
cd ../client && npm install
```

---

## 5. Iniciar el Servidor

```bash
# Desde la carpeta /server
npm run dev
```

Streamlyra creará automáticamente las tablas en la base de datos en el primer arranque (sincronización de Sequelize en modo `alter`).

Si el arranque fue exitoso, verás en la consola:

```
✅ Base de datos conectada
✅ Servidor HTTP escuchando en puerto 3000
✅ Socket.io inicializado
```

---

## 6. Iniciar el Cliente

En otra terminal:

```bash
# Desde la carpeta /client
npm run dev
```

El cliente estará disponible en `http://localhost:5173` por defecto.

---

## Notas de Desarrollo

- **Webhooks en local**: Para recibir webhooks de Twitch/Kick en tu máquina, necesitas exponer el puerto 3000 con una herramienta como [ngrok](https://ngrok.com/) o [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/). Actualiza `SERVER_URL` con la URL generada.
- **YouTube en local**: Las cuotas están desactivadas automáticamente en `NODE_ENV=development`. No necesitas preocuparte por los límites mientras desarrollas.
- **TikTok**: No requiere ninguna credencial de API. Solo necesitas un username válido de TikTok.

---

## Ejecutar Tests

```bash
# Desde la carpeta /server
npm test

# Con cobertura
npm run test:coverage
```

---

ElSantana
