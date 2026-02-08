/**
 * Módulo de moderación refactorizado usando patrón Strategy
 * 
 * Estructura:
 * - strategies/: Implementaciones específicas por plataforma
 * - validators/: Validadores compartidos
 * 
 * Cada estrategia implementa IModerationStrategy y maneja:
 * - Eliminación de mensajes
 * - Bans y timeouts de usuarios
 * - Emisión de eventos de éxito/error
 */

export { IModerationStrategy, ModerationContext } from './strategies/IModerationStrategy';
export { TwitchModerationStrategy } from './strategies/TwitchModerationStrategy';
export { KickModerationStrategy } from './strategies/KickModerationStrategy';
export { YouTubeModerationStrategy } from './strategies/YouTubeModerationStrategy';
export { DashboardModerationStrategy } from './strategies/DashboardModerationStrategy';
export { ModerationValidator } from './validators/ModerationValidator';
