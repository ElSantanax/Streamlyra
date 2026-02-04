import type { DialogType, DialogVariant } from '../../components/ui/Dialog';

interface DialogOptions {
    title?: string;
    message: string;
    variant?: DialogVariant;
    confirmText?: string;
    cancelText?: string;
    placeholder?: string;
    defaultValue?: string;
}

interface DialogState extends DialogOptions {
    isOpen: boolean;
    type: DialogType;
    resolve: (value: boolean | string | null) => void;
}

class DialogService {
    private listeners: Set<(state: DialogState | null) => void> = new Set();
    private currentDialog: DialogState | null = null;

    subscribe(listener: (state: DialogState | null) => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach((listener) => listener(this.currentDialog));
    }

    private show(type: DialogType, options: DialogOptions): Promise<boolean | string | null> {
        return new Promise((resolve) => {
            this.currentDialog = {
                isOpen: true,
                type,
                resolve,
                ...options,
            };
            this.notify();
        });
    }

    close(result: boolean | string | null) {
        if (this.currentDialog) {
            this.currentDialog.resolve(result);
            this.currentDialog = null;
            this.notify();
        }
    }

    alert(message: string, options?: Omit<DialogOptions, 'message'>): Promise<boolean> {
        return this.show('alert', { message, ...options }) as Promise<boolean>;
    }

    confirm(message: string, options?: Omit<DialogOptions, 'message'>): Promise<boolean> {
        return this.show('confirm', {
            message,
            confirmText: 'Sí',
            cancelText: 'No',
            ...options
        }) as Promise<boolean>;
    }

    prompt(message: string, options?: Omit<DialogOptions, 'message'>): Promise<string | null> {
        return this.show('prompt', { message, ...options }) as Promise<string | null>;
    }

    warning(message: string, options?: Omit<DialogOptions, 'message' | 'variant'>): Promise<boolean> {
        return this.confirm(message, { ...options, variant: 'warning' });
    }

    danger(message: string, options?: Omit<DialogOptions, 'message' | 'variant'>): Promise<boolean> {
        return this.confirm(message, { ...options, variant: 'danger' });
    }

    success(message: string, options?: Omit<DialogOptions, 'message' | 'variant'>): Promise<boolean> {
        return this.alert(message, { ...options, variant: 'success' });
    }

    info(message: string, options?: Omit<DialogOptions, 'message' | 'variant'>): Promise<boolean> {
        return this.alert(message, { ...options, variant: 'info' });
    }
}

export const dialog = new DialogService();
export type { DialogState };