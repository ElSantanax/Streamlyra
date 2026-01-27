/**
 * Design System Tokens
 * Centraliza valores de diseño para consistencia
 */

export const DESIGN_TOKENS = {
  // Transiciones comunes
  transitions: {
    fast: 'transition-all duration-200',
    normal: 'transition-all duration-300',
    slow: 'transition-all duration-500',
  },

  // Efectos hover comunes
  hover: {
    scale: 'hover:scale-105 active:scale-95',
    scaleSmall: 'hover:scale-[1.02] active:scale-[0.98]',
    opacity: 'hover:opacity-80',
    bgLight: 'hover:bg-white/5',
    bgPrimary: 'hover:bg-primary/90',
  },

  // Bordes comunes
  borders: {
    default: 'border border-surface-border',
    card: 'border border-surface-border rounded-xl',
    input: 'border border-gray-200 dark:border-gray-700/50',
  },

  // Fondos comunes
  backgrounds: {
    card: 'bg-card-dark',
    surface: 'bg-surface-dark',
    input: 'bg-gray-50/50 dark:bg-input-dark/50',
    overlay: 'bg-black/60 backdrop-blur-sm',
  },

  // Animaciones de entrada
  animations: {
    fadeIn: 'animate-in fade-in duration-200',
    zoomIn: 'animate-in zoom-in-95 duration-200',
    slideInRight: 'animate-in slide-in-from-right duration-300',
  },

  // Sombras
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl',
  },

  // Espaciados comunes
  spacing: {
    section: 'px-6 lg:px-40 py-3',
    card: 'p-4',
    cardLg: 'p-6',
  },
} as const;

/**
 * Helper para combinar clases de diseño
 */
export function combineDesignTokens(...tokens: (string | undefined | false)[]): string {
  return tokens.filter(Boolean).join(' ');
}
