/** Deduplicador de mensajes con buffer circular */

export class MessageDeduplicator {
    private messageIds = new Set<string>();
    private maxSize = 500;

    isDuplicate(id: string): boolean {
        if (this.messageIds.has(id)) {
            return true;
        }

        this.messageIds.add(id);

        if (this.messageIds.size > this.maxSize) {
            const first = this.messageIds.values().next().value as string | undefined;
            if (first) {
                this.messageIds.delete(first);
            }
        }

        return false;
    }

    clear(): void {
        this.messageIds.clear();
    }

    size(): number {
        return this.messageIds.size;
    }
}
