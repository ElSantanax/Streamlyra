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

  private ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  private show(message: string, type: ToastType, options: ToastOptions = {}) {
    const { duration = 3000 } = options;
    const container = this.ensureContainer();

    const toast = document.createElement('div');
    toast.className = `
      pointer-events-auto px-4 py-3 rounded-lg shadow-lg border
      flex items-center gap-3 min-w-[300px] max-w-md
      animate-in fade-in slide-in-from-right duration-300
      ${this.getTypeStyles(type)}
    `;

    const icon = this.getIcon(type);
    const iconEl = document.createElement('span');
    iconEl.className = 'shrink-0 text-lg';
    iconEl.innerHTML = icon;

    const messageEl = document.createElement('span');
    messageEl.className = 'text-sm font-medium flex-1';
    messageEl.textContent = message;

    toast.appendChild(iconEl);
    toast.appendChild(messageEl);
    container.appendChild(toast);

    // Auto-remove
    setTimeout(() => {
      toast.style.animation = 'fade-out 200ms ease-out forwards';
      setTimeout(() => {
        container.removeChild(toast);
        if (container.children.length === 0) {
          document.body.removeChild(container);
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
