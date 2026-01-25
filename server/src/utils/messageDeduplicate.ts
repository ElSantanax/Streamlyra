/**
 * Message Deduplicator - Prevents replay of duplicate messages
 * Uses a circular buffer (Set) to track last 500 unique message IDs
 */
export class MessageDeduplicator {
    private messageIds = new Set<string>();
    private maxSize = 500;

    /**
     * Check if message is duplicate and add to tracker
     * @param id Message ID to check
     * @returns true if duplicate, false if new message
     */
    isDuplicate(id: string): boolean {
        if (this.messageIds.has(id)) {
            return true; // Duplicate found
        }

        // Add new message ID
        this.messageIds.add(id);

        // Circular buffer: remove oldest if exceeds maxSize
        if (this.messageIds.size > this.maxSize) {
            const first = this.messageIds.values().next().value as string | undefined;
            if (first) {
                this.messageIds.delete(first);
            }
        }

        return false; // New message
    }

    /**
     * Clear all tracked message IDs
     */
    clear(): void {
        this.messageIds.clear();
    }

    /**
     * Get current number of tracked message IDs
     */
    size(): number {
        return this.messageIds.size;
    }
}
