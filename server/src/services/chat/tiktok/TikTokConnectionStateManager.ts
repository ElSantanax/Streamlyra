/**
 * Gestor de Estado de Conexiones de TikTok
 * Responsabilidad: Mantener y gestionar el estado de las conexiones activas
 */

import { WebcastPushConnection } from 'tiktok-live-connector';

export class TikTokConnectionStateManager {
    private connectingUsers: Set<string> = new Set();
    private activeConnections: Map<string, WebcastPushConnection> = new Map();
    private retryCleanup: Map<string, () => void> = new Map();
    private shouldReconnect: Map<string, boolean> = new Map();

    isConnecting(userId: string): boolean {
        return this.connectingUsers.has(userId);
    }

    setConnecting(userId: string): void {
        this.connectingUsers.add(userId);
    }

    removeConnecting(userId: string): void {
        this.connectingUsers.delete(userId);
    }

    hasActiveConnection(userId: string): boolean {
        return this.activeConnections.has(userId);
    }

    getActiveConnection(userId: string): WebcastPushConnection | undefined {
        return this.activeConnections.get(userId);
    }

    setActiveConnection(userId: string, connection: WebcastPushConnection): void {
        this.activeConnections.set(userId, connection);
    }

    removeActiveConnection(userId: string): void {
        this.activeConnections.delete(userId);
    }

    shouldAutoReconnect(userId: string): boolean {
        return this.shouldReconnect.get(userId) ?? false;
    }

    enableAutoReconnect(userId: string): void {
        this.shouldReconnect.set(userId, true);
    }

    disableAutoReconnect(userId: string): void {
        this.shouldReconnect.delete(userId);
    }

    getRetryCleanup(userId: string): (() => void) | undefined {
        return this.retryCleanup.get(userId);
    }

    setRetryCleanup(userId: string, cleanup: () => void): void {
        this.retryCleanup.set(userId, cleanup);
    }

    hasRetryCleanup(userId: string): boolean {
        return this.retryCleanup.has(userId);
    }

    executeAndRemoveRetryCleanup(userId: string): void {
        const cleanup = this.retryCleanup.get(userId);
        if (cleanup) {
            cleanup();
            this.retryCleanup.delete(userId);
        }
    }

    cleanupUser(userId: string): void {
        this.removeConnecting(userId);
        this.removeActiveConnection(userId);
        this.disableAutoReconnect(userId);
        this.executeAndRemoveRetryCleanup(userId);
    }
}
