# Guia de Contribucion

Si deseas contribuir a Streamlyra, sigue estos pasos para asegurar un flujo de trabajo ordenado y consistente.

## Flujo de Trabajo

### 1. Hacer un Fork

Ve al repositorio oficial en GitHub: [https://github.com/ElSantanax/Streamlyra](https://github.com/ElSantanax/Streamlyra) y haz clic en el boton "Fork". Esto creara una copia del proyecto en tu propia cuenta.

### 2. Clonar tu repositorio

Clona tu fork localmente en tu maquina:

```bash
git clone https://github.com/TU_USUARIO/Streamlyra.git
cd Streamlyra
```

### 3. Configurar el Remoto Original

Para mantener tu fork actualizado, agrega el repositorio original como un remoto llamado `upstream`:

```bash
git remote add upstream https://github.com/ElSantanax/Streamlyra.git
```

### 4. Crear una Rama

Crea una rama para trabajar en tu funcionalidad o correccion:

```bash
git checkout -b feature/nombre-de-tu-mejora
# o
git checkout -b fix/nombre-del-error
```

### 5. Realizar Cambios y Commit

Haz tus cambios siguiendo las buenas practicas y realiza los commits:

```bash
git add .
git commit -m "Explicacion clara del cambio"
```

### 6. Subir Cambios y Pull Request

Sube tus cambios a tu fork:

```bash
git push origin nombre-de-tu-rama
```

Luego, ve al repositorio original en GitHub y veras un aviso para abrir un "Pull Request".

---

## Reglas del Proyecto

- **Simplicidad**: Sigue el principio KISS. Evita sobre-ingenieria.
- **Consistencia**: Mantén el estilo de código existente.
- **Mensajes de Commit**: Escribe mensajes descriptivos en español o ingles.
- **Verificacion**: Antes de enviar un Pull Request, es obligatorio ejecutar los siguientes comandos localmente:

#### En el Cliente (client/):

```bash
npm run lint   # Detecta errores de estilo y posibles bugs
npm run build  # Verifica la compilacion de produccion
```

#### En el Servidor (server/):

```bash
npm run lint          # Asegura el cumplimiento de las reglas de estilo
npm run build:clean   # Valida el codigo TypeScript
```
