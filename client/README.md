# Streamlyra Client

Una aplicación web moderna construida con React, TypeScript y Vite para la plataforma de streaming Streamlyra.

## 🚀 Características

- **Streaming en tiempo real** con Socket.IO
- **Autenticación segura** con rutas protegidas
- **Interfaz moderna** con Tailwind CSS
- **Selector de emojis** con soporte completo de Unicode para todas las plataformas
- **Rendimiento optimizado** con lazy loading y virtualización
- **Testing completo** con Vitest y Cypress
- **Desarrollo tipo seguro** con TypeScript

## 🛠️ Stack Tecnológico

### Core
- **React 19** - UI library con las últimas características
- **TypeScript** - Desarrollo tipo seguro
- **Vite** - Build tool ultra rápido
- **React Router** - Gestión de rutas

### Estilos
- **Tailwind CSS 4** - Framework CSS utility-first
- **React Icons** - Biblioteca de iconos

### Comunicación
- **Socket.IO Client** - Conexión en tiempo real
- **Emoji Picker React** - Selector de emojis Unicode

### Testing
- **Vitest** - Unit testing con UI
- **Testing Library** - Testing de componentes
- **Cypress** - E2E testing
- **jsdom** - DOM testing environment

### Desarrollo
- **ESLint** - Linting y calidad de código
- **Why Did You Render** - Optimización de renders
- **React Virtualized** - Virtualización de listas

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── common/         # Componentes reutilizables
│   ├── connection/     # Componentes de conexión
│   ├── dashboard/      # Componentes del dashboard
│   ├── landing/        # Componentes de landing
│   └── ui/             # Componentes UI base
├── pages/              # Páginas principales
├── hooks/              # Custom hooks React
├── services/           # Servicios de API
├── api/                # Configuración de API
├── context/            # React Context
├── lib/                # Utilidades y librerías
├── utils/              # Funciones helper
├── types/              # Definiciones TypeScript
├── constants/          # Constantes de la aplicación
├── config/             # Configuraciones
└── test/               # Configuración de testing
```

## 🚀 Comenzando

### Prerrequisitos
- Node.js 18+
- npm o yarn

### Instalación
```bash
npm install
```

### Scripts Disponibles

#### Desarrollo
```bash
npm run dev          # Iniciar servidor de desarrollo
npm run preview      # Previsualizar producción
```

#### Build
```bash
npm run build        # Build para producción
```

#### Testing
```bash
npm run test         # Ejecutar tests unitarios
npm run test:ui      # Interfaz visual de tests
npm run test:coverage # Reporte de cobertura
npm run e2e          # Ejecutar tests E2E
npm run e2e:open     # Abrir interfaz Cypress
```

#### Calidad
```bash
npm run lint         # Ejecutar ESLint
```

## 🔧 Configuración

### Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

### Configuración de ESLint
El proyecto incluye configuración ESLint optimizada para React + TypeScript con reglas estrictas de tipo.

## 🧪 Testing

### Unit Tests
Los tests unitarios utilizan Vitest con Testing Library:
```bash
npm run test
```

### E2E Tests
Los tests end-to-end utilizan Cypress:
```bash
npm run e2e:open
```

### Cobertura
Genera reportes de cobertura detallados:
```bash
npm run test:coverage
```

## 🏗️ Arquitectura

### Componentes
- **Common**: Componentes reutilizables (Spinner, ErrorBoundary, etc.)
- **UI**: Componentes base de interfaz
- **Feature-specific**: Componentes por dominio (Dashboard, Landing, etc.)

### Estado Global
- **Context API**: Para autenticación y estado global
- **Custom Hooks**: Para lógica reutilizable

### Rutas
- **Públicas**: Landing, Login, Register
- **Protegidas**: Dashboard, Conexiones
- **Lazy Loading**: Para optimización de rendimiento

### API
- **Servicios centralizados**: Para comunicación con backend
- **Type-safe**: Interfaces TypeScript para todas las respuestas

## 🚀 Despliegue

### Build de Producción
```bash
npm run build
```

### Preview Local
```bash
npm run preview
```

## 📈 Optimizaciones

- **Code Splitting**: Lazy loading de componentes
- **Virtualización**: Para listas grandes
- **Memoization**: Optimización de renders con Why Did You Render
- **Bundle Analysis**: Optimización del tamaño del bundle

## 🤝 Contribuir

1. Fork el proyecto
2. Crear una feature branch (`git checkout -b feature/amazing-feature`)
3. Commit los cambios (`git commit -m 'Add amazing feature'`)
4. Push a la branch (`git push origin feature/amazing-feature`)
5. Abrir un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.
