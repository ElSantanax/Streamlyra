/**
 * Sistema de notificaciones Toast centralizado
 * Reemplaza alert() y console.log() dispersos
 * 
 * NOTA: Esta es una implementación simple.
 * Para producción, considera usar una librería como react-hot-toast o sonner
 */

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  duration?: number;
  position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';
}

class ToastManager {
  private container: HTMLDivElement | null = null;
  private targetElement: HTMLElement | null = null;
  private activeToasts: Set<string> = new Set();
  private maxToasts: number = 3;

  // Permite configurar un elemento específico donde mostrar los toasts
  setTargetElement(element: HTMLElement | null) {
    this.targetElement = element;
    // Limpiar contenedor anterior si existe
    if (this.container) {
      const parent = this.container.parentElement;
      if (parent && parent.contains(this.container)) {
        parent.removeChild(this.container);
      }
      this.container = null;
    }
  }

  private ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      // Posicionamiento: centrado en el área de mensajes
      this.container.className = 'absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none';

      // Si hay un elemento target específico, usar ese; sino usar body
      const parent = this.targetElement || document.body;
      parent.appendChild(this.container);

      // Si se usa body, cambiar a fixed
      if (!this.targetElement) {
        this.container.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 lg:top-20 lg:bottom-auto z-[9999] flex flex-col gap-2 pointer-events-none w-full max-w-md px-4';
      }
    }
    return this.container;
  }

  private show(message: string, type: ToastType, options: ToastOptions = {}) {
    const { duration = 3000 } = options;

    // Crear un identificador único para este toast
    const toastId = `${type}:${message}`;

    // Si ya existe un toast con el mismo mensaje, no mostrar otro
    if (this.activeToasts.has(toastId)) {
      return;
    }

    // Limitar el número máximo de toasts visibles
    if (this.activeToasts.size >= this.maxToasts) {
      return;
    }

    // Marcar este toast como activo
    this.activeToasts.add(toastId);

    const container = this.ensureContainer();

    const toast = document.createElement('div');
    // Siempre deslizar desde arriba cuando está en el área de mensajes
    const slideAnimation = this.targetElement ? 'slide-in-from-top' :
      (window.innerWidth < 1024 ? 'slide-in-from-bottom' : 'slide-in-from-top');

    toast.className = `
      pointer-events-auto px-4 py-3 rounded-lg shadow-lg border
      flex items-center justify-center gap-3 min-w-[300px] max-w-md
      animate-in fade-in ${slideAnimation} duration-300
      ${this.getTypeStyles(type)}
    `;

    const icon = this.getIcon(type);
    const iconEl = document.createElement('span');
    iconEl.className = 'shrink-0 text-lg';
    iconEl.innerHTML = icon;

    const messageEl = document.createElement('span');
    messageEl.className = 'text-sm font-medium text-center';
    messageEl.textContent = message;

    toast.appendChild(iconEl);
    toast.appendChild(messageEl);
    container.appendChild(toast);

    // Auto-remove
    setTimeout(() => {
      toast.classList.remove('fade-in', slideAnimation);
      toast.classList.add('fade-out');
      setTimeout(() => {
        // Verificar que el toast y el contenedor aún existen antes de remover
        if (toast.parentElement && container.contains(toast)) {
          container.removeChild(toast);
        }
        // Remover de la lista de toasts activos
        this.activeToasts.delete(toastId);
        // Solo limpiar el contenedor si está vacío y aún existe en el DOM
        if (container.children.length === 0) {
          const parent = container.parentElement;
          if (parent && parent.contains(container)) {
            parent.removeChild(container);
          }
          this.container = null;
        }
      }, 200);
    }, duration);
  }

  private getTypeStyles(type: ToastType): string {
    const styles = {
      success: 'bg-green-500/10 border-green-500/20 text-green-500',
      error: 'bg-red-500/10 border-red-500/20 text-red-500',
      warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500',
      info: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
    };
    return styles[type];
  }

  private getIcon(type: ToastType): string {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };
    return icons[type];
  }

  success(message: string, options?: ToastOptions) {
    this.show(message, 'success', options);
  }

  error(message: string, options?: ToastOptions) {
    this.show(message, 'error', options);
  }

  warning(message: string, options?: ToastOptions) {
    this.show(message, 'warning', options);
  }

  info(message: string, options?: ToastOptions) {
    this.show(message, 'info', options);
  }
}

// Singleton instance
export const toast = new ToastManager();
