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

  setTargetElement(element: HTMLElement | null) {
    this.targetElement = element;
    if (this.container) {
      const parent = this.container.parentElement;
      if (parent && parent.contains(this.container)) {
        parent.removeChild(this.container);
      }
      this.container = null;
    }

    if (element === null) {
      this.activeToasts.clear();
    }
  }

  private ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'absolute top-4 inset-x-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4';

      const parent = this.targetElement || document.body;
      parent.appendChild(this.container);

      if (!this.targetElement) {
        this.container.className = 'fixed top-20 inset-x-0 z-[9999] flex flex-col items-center gap-2 pointer-events-none px-4';
      }
    }
    return this.container;
  }

  private show(message: string, type: ToastType, options: ToastOptions = {}) {
    const { duration = 3000 } = options;
    const toastId = `${type}:${message}`;

    if (this.activeToasts.has(toastId)) {
      return;
    }

    if (this.activeToasts.size >= this.maxToasts) {
      return;
    }

    this.activeToasts.add(toastId);

    const container = this.ensureContainer();
    const toast = document.createElement('div');
    const slideAnimation = this.targetElement ? 'slide-in-from-top' :
      (window.innerWidth < 1024 ? 'slide-in-from-bottom' : 'slide-in-from-top');

    toast.className = `
      pointer-events-auto px-4 py-3 rounded-lg shadow-lg border
      flex items-center justify-center gap-3 min-w-[300px] max-w-md
      animate-in fade-in ${slideAnimation} duration-300
      ${this.getTypeStyles(type)}
    `;

    const messageEl = document.createElement('span');
    messageEl.className = 'text-sm font-medium text-center';
    messageEl.textContent = message;

    toast.appendChild(messageEl);
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('fade-in', slideAnimation);
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentElement && container.contains(toast)) {
          container.removeChild(toast);
        }
        this.activeToasts.delete(toastId);
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

export const toast = new ToastManager();