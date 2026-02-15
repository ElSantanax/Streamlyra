## Contribuyendo a Streamlyra

¡Gracias por tu interés en contribuir a Streamlyra! Este documento te guiará sobre cómo puedes participar en el proyecto, sin importar tu nivel de experiencia.

## Nuestra Filosofía

Streamlyra es un proyecto de código abierto creado para resolver una necesidad real de la comunidad de streamers. Está diseñado como un espacio de aprendizaje y colaboración donde:

- **Programadores** de todos los niveles pueden contribuir y aprender
- **Diseñadores** pueden mejorar la experiencia de usuario
- **Testers** pueden ayudar a garantizar la calidad del producto
- **Creadores de contenido** pueden sugerir funcionalidades

> [!NOTE]
> **No importa tu nivel de experiencia.** Este proyecto fue creado precisamente para que puedas ver cómo funciona una aplicación real que resuelve un problema concreto, aprender de su arquitectura, y contribuir con tus ideas y habilidades.

## Formas de Contribuir

### Para Programadores

#### Reportar y Solucionar Bugs
- Revisa los [issues abiertos](../../issues) y elige uno que te interese
- Reporta bugs con pasos detallados para reproducirlos
- Propón soluciones a problemas existentes

#### Mejorar la Documentación
- Mejora la documentación del código con comentarios claros
- Actualiza READMEs y guías de instalación
- Crea tutoriales o ejemplos de uso

#### Optimización y Rendimiento
- Identifica cuellos de botella en el código
- Optimiza consultas a base de datos
- Mejora el rendimiento del frontend y backend

#### Testing
- Agrega tests para aumentar la cobertura
- Escribe tests unitarios y de integración
- Prueba la aplicación en diferentes navegadores y dispositivos

#### Nuevas Funcionalidades
- Implementa nuevas características siguiendo el roadmap
- Propone mejoras basadas en necesidades reales de streamers
- Integra nuevas plataformas de streaming

### Para Diseñadores

#### Interfaz de Usuario
- Mejora la usabilidad y accesibilidad
- Crea mockups para nuevas funcionalidades
- Optimiza la experiencia móvil y responsive

#### Recursos Visuales
- Diseña iconos y elementos gráficos
- Crea animaciones y transiciones
- Mejora la identidad visual del proyecto

### Para Testers

#### Control de Calidad
- Reporta bugs con pasos detallados para reproducirlos
- Prueba la aplicación en diferentes navegadores
- Valida el comportamiento en casos extremos
- Sugiere mejoras en la usabilidad

### Para Creadores de Contenido

#### Feedback de Usuario
- Reporta problemas desde la perspectiva del streamer
- Sugiere funcionalidades basadas en tu experiencia
- Comparte casos de uso reales
- Ayuda a priorizar funcionalidades importantes

## Configuración del Entorno de Desarrollo

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

## Proceso de Contribución

### 1. Elige un Issue o Crea uno Nuevo
- Busca issues etiquetados como `good first issue` para principiantes
- Crea un nuevo issue describiendo el problema o mejora que quieres implementar
- Espera aprobación antes de comenzar a trabajar en issues grandes

### 2. Prepara tu Entorno
- Haz fork del repositorio
- Clona tu fork localmente
- Configura el upstream para mantener tu fork actualizado

```bash
git clone https://github.com/tu-usuario/Streamlyra.git
cd Streamlyra
git remote add upstream https://github.com/usuario-original/Streamlyra.git
```

### 3. Crea una Rama
Usa una convención clara para los nombres de ramas:

```bash
# Para nuevas funcionalidades
git checkout -b feature/nombre-funcionalidad

# Para arreglos de bugs
git checkout -b fix/descripcion-del-bug

# Para mejoras de documentación
git checkout -b docs/mejora-documentacion
```

### 4. Realiza tus Cambios
- Sigue las convenciones de código del proyecto
- Agrega tests si es necesario
- Asegúrate de que todos los tests pasen
- Commitea tus cambios con mensajes descriptivos

### 5. Envía tus Cambios
```bash
# Sincroniza con el upstream
git fetch upstream
git rebase upstream/main

# Push a tu fork
git push origin feature/nombre-funcionalidad
```

### 6. Crea un Pull Request
- Usa una plantilla de PR si está disponible
- Describe claramente qué cambios hiciste y por qué
- Agrega capturas de pantalla si es una mejora visual
- Espera la revisión y feedback

## Convenciones de Código

### Commits
Usa [Conventional Commits](https://www.conventionalcommits.org/) para los mensajes:

```
feat: agrega nueva funcionalidad de X
fix: corrige error en el componente Y
docs: actualiza README de instalación
style: formatea código con Prettier
refactor: mejora estructura del módulo Z
test: agrega tests para la API de usuarios
```

### Código
- **TypeScript** para tipado fuerte
- **ESLint** y **Prettier** para formato consistente
- **Componentes** descriptivos y reutilizables
- **Comentarios** donde el código no sea autoexplicativo

### Tests
- Escribe tests para nuevas funcionalidades
- Mantén una cobertura de código alta
- Usa descripciones claras en los tests

## Etiquetas de Issues

- `good first issue`: Ideal para principiantes
- `help wanted`: Necesita ayuda de la comunidad
- `bug`: Error reportado
- `enhancement`: Mejora propuesta
- `documentation`: Mejoras en la documentación
- `design`: Cambios de diseño/UX

## Código de Conducta

- Sé respetuoso y considerado con todos los participantes
- Acepta críticas constructivas de tu trabajo
- Enfócate en lo que es mejor para la comunidad
- Muestra empatía hacia otros miembros de la comunidad

## Reconocimientos

Todas las contribuciones son valoradas y reconocidas:

- Tu nombre aparecerá en la lista de contribuidores
- Las contribuciones destacadas se mencionan en los release notes
- Los contribuidores activos pueden ser invitados a mantener el proyecto

