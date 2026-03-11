# Arquitectura del Cliente

Streamlyra está construido sobre una arquitectura moderna de React, utilizando **Vite** para el empaquetado y **TypeScript** para garantizar la robustez del código. El frontend se encarga de la interacción con el usuario, la gestión de conexiones a plataformas de streaming y la visualización de overlays en tiempo real.

## Tecnologías Principales

- **React 18**: Biblioteca base para la interfaz de usuario.
- **Vite**: Herramienta de construcción ultrarrápida.
- **React Router Dom**: Gestión de navegación y rutas.
- **React Context**: Gestión del estado global (Autenticación, Conexiones).
- **i18next**: Soporte multi-idioma (Español/Inglés).
- **Tailwind CSS**: Framework para el diseño y estilizado.
- **Lucide React**: Biblioteca de iconos.

## Estructura de Directorios (`src/`)

La carpeta `src/` del cliente está organizada para separar claramente las responsabilidades:

- **`components/`**: Componentes visuales reutilizables.
    - `common/`: Elementos básicos (Botones, Spinners, etc.).
    - `dashboard/`: Componentes específicos del panel de control.
    - `landing/`: Componentes para la página de inicio.
    - `ui/`: Componentes de interfaz compartidos.
- **`pages/`**: Vistas principales de la aplicación que se asocian a las rutas.
- **`context/`**: Proveedores de estado global mediante la API Context de React.
- **`hooks/`**: Ganchos personalizados para lógica reutilizable.
- **`services/`**: Lógica de interacción con la API del servidor.
- **`lib/`**: Configuraciones de librerías externas.
- **`constants/`**: Valores estáticos que no cambian.
- **`types/`**: Definiciones de tipos TypeScript.
- **`locales/`**: Archivos de traducción JSON.

## Flujo de Datos

1. **Rutas**: Definidas en `App.tsx`, gestionan qué componente de `pages/` se renderiza.
2. **Proveedores de Contexto**: Envuelven la aplicación para proveer estado de sesión y conexiones activas.
3. **Servicios**: Los componentes llaman a funciones en `services/` para realizar peticiones HTTP al backend.
4. **Hooks**: Abstraen lógica compleja (como el estado de carga o validación) para simplificar los componentes.

## Principios de Diseño

- **Componentes Atómicos**: Intentamos que los componentes sean lo más pequeños y específicos posible.
- **Single Source of Truth**: El estado de la aplicación reside principalmente en los Contextos para evitar el prop-drilling excesivo.
- **Lazy Loading**: Las páginas se cargan bajo demanda utilizando `React.lazy` para optimizar el tiempo de carga inicial.
