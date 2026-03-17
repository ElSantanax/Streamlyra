# Arquitectura del Cliente

Streamlyra está construido sobre una arquitectura moderna de React, utilizando **Vite** para el empaquetado y **TypeScript** para garantizar la robustez del código. El frontend se encarga de la interacción con el usuario, la gestión de conexiones a plataformas de streaming y la visualización de overlays en tiempo real.

## Tecnologías Principales

- **React 18**: Biblioteca base para la interfaz de usuario.
- **Vite**: Herramienta de construcción ultrarrápida.
- **React Router Dom**: Gestión de navegación y rutas.
- **Zustand**: Gestión del estado global de alto rendimiento (Conexiones, Chat).
- **React Context**: Gestión de identidad y sesión (Autenticación).
- **i18next**: Soporte multi-idioma (Español/Inglés).
- **Tailwind CSS**: Framework para el diseño y estilizado.

## Estructura de Directorios (`src/`)

La carpeta `src/` del cliente está organizada para separar claramente las responsabilidades:

- **`store/`**: Centraliza el estado de la aplicación mediante **Zustand Stores**. Aquí reside la lógica reactiva para las conexiones y el feed de chat.
- **`components/`**: Componentes visuales reutilizables segregados por dominio (dashboard, common, overlay).
- **`pages/`**: Vistas principales de la aplicación asociadas a las rutas.
- **`context/`**: Proveedores de estado para datos de baja frecuencia (Autenticación).
- **`hooks/`**: Ganchos personalizados que consumen de los *Stores* o *Contextos*.
- **`services/`**: Lógica de interacción con la API del servidor.
- **`lib/`**: Configuraciones de librerías externas.
- **`types/`**: Definiciones de tipos TypeScript compartidos.

## Flujo de Datos

1. **Rutas**: Definidas en `App.tsx`, gestionan qué página se renderiza.
2. **Gestión de Estado**: 
    - **Identity**: Manejada por `AuthProvider` (Context).
    - **Live Data**: Manejada por `useConnectionsStore` y `useChatStore` (Zustand).
3. **Sincronización**: Los hooks de socket (`useSocket`) actualizan los stores de Zustand en tiempo real, provocando re-renders quirúrgicos solo en los componentes afectados.
4. **Servicios**: Los componentes o stores llaman a `services/` para persistir datos o realizar acciones en el backend.

## Principios de Diseño

- **Componentes Atómicos**: Intentamos que los componentes sean lo más pequeños y específicos posible.
- **Single Source of Truth**: El estado de la aplicación reside principalmente en los **Stores de Zustand** (para alta frecuencia) y **Contextos** (para identidad), eliminando el prop-drilling y garantizando sincronización entre componentes.
- **Lazy Loading**: Las páginas se cargan bajo demanda utilizando `React.lazy` para optimizar el tiempo de carga inicial.
