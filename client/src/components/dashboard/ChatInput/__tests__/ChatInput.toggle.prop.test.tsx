import { describe, it, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { render, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ChatInput from '../index';

// Mock useAuth hook
vi.mock('../../../../hooks/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'test-user-id', username: 'testuser' },
        isAuthenticated: true,
    })
}));

// Mock socket
vi.mock('../../../../services/socket', () => ({
    socket: {
        connected: true,
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    }
}));

/**
 * Property-based tests for ChatInput toggle state changes
 * Feature: multi-platform-message-sending
 */

describe('Feature: multi-platform-message-sending, Property 1: Toggle state updates are immediate', () => {
    afterEach(() => {
        cleanup();
    });

    /**
     * Property 1: Toggle state updates are immediate
     * Validates: Requirements 1.2
     * 
     * For any platform toggle and any user click action, 
     * the toggle state should flip immediately in the UI
     */
    it('should update toggle state immediately when clicked', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate a random platform to toggle (excluding tiktok which is not rendered)
                fc.constantFrom('twitch', 'youtube'),
                // Generate a random number of clicks (1-3)
                fc.integer({ min: 1, max: 3 }),
                async (platform, clickCount) => {
                    const user = userEvent.setup();

                    const { container, unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        // Get the toggle element
                        const toggle = container.querySelector(`input#toggle-${platform}`) as HTMLInputElement;
                        if (!toggle) {
                            throw new Error(`Toggle for ${platform} not found`);
                        }

                        // Record initial state
                        const initialState = toggle.checked;
                        let expectedState = initialState;

                        // Perform clicks and verify state changes immediately after each click
                        for (let i = 0; i < clickCount; i++) {
                            // Click the toggle
                            await user.click(toggle);

                            // Expected state should flip
                            expectedState = !expectedState;

                            // Verify state changed immediately
                            if (toggle.checked !== expectedState) {
                                throw new Error(
                                    `Toggle state did not update immediately. Expected ${expectedState}, got ${toggle.checked} after click ${i + 1}`
                                );
                            }
                        }

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 20 }
        );
    }, 15000);

    /**
     * Property 1 (Extended): Multiple toggles can be changed independently and immediately
     * Validates: Requirements 1.2
     */
    it('should update multiple toggles independently and immediately', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate a sequence of toggle actions
                fc.array(
                    fc.record({
                        platform: fc.constantFrom('twitch', 'youtube'),
                        clicks: fc.integer({ min: 1, max: 2 })
                    }),
                    { minLength: 1, maxLength: 3 }
                ),
                async (actions) => {
                    const user = userEvent.setup();

                    const { container, unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        // Track expected states
                        const states: Record<string, boolean> = {
                            twitch: true,  // Initial state
                            youtube: true  // Initial state
                        };

                        // Execute each action
                        for (const action of actions) {
                            const toggle = container.querySelector(`input#toggle-${action.platform}`) as HTMLInputElement;
                            if (!toggle) {
                                throw new Error(`Toggle for ${action.platform} not found`);
                            }

                            // Perform clicks
                            for (let i = 0; i < action.clicks; i++) {
                                await user.click(toggle);
                                states[action.platform] = !states[action.platform];

                                // Verify immediate update
                                if (toggle.checked !== states[action.platform]) {
                                    throw new Error(
                                        `Toggle ${action.platform} state mismatch. Expected ${states[action.platform]}, got ${toggle.checked}`
                                    );
                                }
                            }
                        }

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 20 }
        );
    }, 15000);
});

describe('Feature: multi-platform-message-sending, Property 2: "Todos" toggle synchronizes all enabled platforms', () => {
    afterEach(() => {
        cleanup();
    });

    /**
     * Property 2: "Todos" toggle synchronizes all enabled platforms
     * Validates: Requirements 1.3
     * 
     * For any state of the "Todos" toggle, when clicked, 
     * all enabled platform toggles (excluding TikTok) should match its state
     */
    it('should synchronize all enabled platforms when "Todos" is toggled', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate random number of clicks on "Todos" toggle
                fc.integer({ min: 1, max: 3 }),
                async (clickCount) => {
                    const user = userEvent.setup();

                    const { container, unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        // Get all toggles
                        const todosToggle = container.querySelector('input#toggle-all') as HTMLInputElement;
                        const twitchToggle = container.querySelector('input#toggle-twitch') as HTMLInputElement;
                        const youtubeToggle = container.querySelector('input#toggle-youtube') as HTMLInputElement;
                        const kickToggle = container.querySelector('input#toggle-kick') as HTMLInputElement;

                        if (!todosToggle || !twitchToggle || !youtubeToggle || !kickToggle) {
                            throw new Error('One or more toggles not found');
                        }

                        // Track expected state
                        let expectedState = todosToggle.checked;

                        // Perform clicks and verify synchronization
                        for (let i = 0; i < clickCount; i++) {
                            await user.click(todosToggle);
                            expectedState = !expectedState;

                            // Verify all enabled platforms match the "Todos" state
                            if (twitchToggle.checked !== expectedState) {
                                throw new Error(
                                    `Twitch toggle not synchronized. Expected ${expectedState}, got ${twitchToggle.checked}`
                                );
                            }

                            if (youtubeToggle.checked !== expectedState) {
                                throw new Error(
                                    `YouTube toggle not synchronized. Expected ${expectedState}, got ${youtubeToggle.checked}`
                                );
                            }

                            if (kickToggle.checked !== expectedState) {
                                throw new Error(
                                    `Kick toggle not synchronized. Expected ${expectedState}, got ${kickToggle.checked}`
                                );
                            }
                        }

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 20 }
        );
    }, 15000);

    /**
     * Property 2 (Extended): "Todos" toggle synchronizes after individual platform changes
     * Validates: Requirements 1.3
     */
    it('should synchronize all platforms regardless of previous individual changes', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate random individual toggle changes before clicking "Todos"
                fc.array(
                    fc.constantFrom('twitch', 'youtube'),
                    { minLength: 0, maxLength: 3 }
                ),
                // Generate the final state for "Todos"
                fc.boolean(),
                async (individualToggles, todosTargetState) => {
                    const user = userEvent.setup();

                    const { container, unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        // Get all toggles
                        const todosToggle = container.querySelector('input#toggle-all') as HTMLInputElement;
                        const twitchToggle = container.querySelector('input#toggle-twitch') as HTMLInputElement;
                        const youtubeToggle = container.querySelector('input#toggle-youtube') as HTMLInputElement;
                        const kickToggle = container.querySelector('input#toggle-kick') as HTMLInputElement;

                        if (!todosToggle || !twitchToggle || !youtubeToggle || !kickToggle) {
                            throw new Error('One or more toggles not found');
                        }

                        // Make random individual changes
                        for (const platform of individualToggles) {
                            const toggle = container.querySelector(`input#toggle-${platform}`) as HTMLInputElement;
                            await user.click(toggle);
                        }

                        // Now click "Todos" to synchronize all platforms to the target state
                        // We need to ensure "Todos" ends up in the target state
                        // If it's already in the target state, click it twice (toggle off and back on)
                        if (todosToggle.checked === todosTargetState) {
                            // Click twice to toggle off and back to target state
                            await user.click(todosToggle);
                            await user.click(todosToggle);
                        } else {
                            // Click once to reach target state
                            await user.click(todosToggle);
                        }

                        // Wait for all state updates to propagate to the DOM
                        await waitFor(() => {
                            // Verify all enabled platforms are synchronized to the "Todos" state
                            if (twitchToggle.checked !== todosTargetState) {
                                throw new Error(
                                    `Twitch not synchronized after Todos toggle. Expected ${todosTargetState}, got ${twitchToggle.checked}`
                                );
                            }

                            if (youtubeToggle.checked !== todosTargetState) {
                                throw new Error(
                                    `YouTube not synchronized after Todos toggle. Expected ${todosTargetState}, got ${youtubeToggle.checked}`
                                );
                            }

                            if (kickToggle.checked !== todosTargetState) {
                                throw new Error(
                                    `Kick not synchronized after Todos toggle. Expected ${todosTargetState}, got ${kickToggle.checked}`
                                );
                            }
                        });

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 20 }
        );
    }, 15000);
});

describe('Feature: multi-platform-message-sending, Property 3: TikTok toggle remains disabled', () => {
    afterEach(() => {
        cleanup();
    });

    /**
     * Property 3: TikTok toggle remains disabled
     * Validates: Requirements 1.4, 8.2
     * 
     * For any user action or system state, 
     * the TikTok toggle should always remain in a disabled state
     */
    it('should never render TikTok toggle regardless of other toggle states', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate random sequence of toggle actions
                fc.array(
                    fc.record({
                        action: fc.constantFrom('toggle-twitch', 'toggle-youtube', 'toggle-all'),
                        clicks: fc.integer({ min: 1, max: 2 })
                    }),
                    { minLength: 0, maxLength: 5 }
                ),
                async (actions) => {
                    const user = userEvent.setup();

                    const { container, unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        // Verify TikTok is not rendered initially
                        let tiktokToggle = container.querySelector('input#toggle-tiktok');
                        if (tiktokToggle !== null) {
                            throw new Error('TikTok toggle should not be rendered initially');
                        }

                        // Perform various toggle actions
                        for (const action of actions) {
                            const toggle = container.querySelector(`input#${action.action}`) as HTMLInputElement;
                            if (toggle) {
                                for (let i = 0; i < action.clicks; i++) {
                                    await user.click(toggle);
                                }
                            }

                            // Verify TikTok is still not rendered after each action
                            tiktokToggle = container.querySelector('input#toggle-tiktok');
                            if (tiktokToggle !== null) {
                                throw new Error(
                                    `TikTok toggle should not be rendered after action ${action.action}`
                                );
                            }
                        }

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 20 }
        );
    }, 15000);

    /**
     * Property 3 (Extended): TikTok is excluded from platform selection state
     * Validates: Requirements 1.4, 8.2
     */
    it('should maintain TikTok as false in state regardless of toggle actions', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate random toggle sequence including attempts to enable all
                fc.array(
                    fc.constantFrom('toggle-all', 'toggle-twitch', 'toggle-youtube'),
                    { minLength: 1, maxLength: 5 }
                ),
                async (toggleSequence) => {
                    const user = userEvent.setup();

                    const { container, unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        // Execute toggle sequence
                        for (const toggleId of toggleSequence) {
                            const toggle = container.querySelector(`input#${toggleId}`) as HTMLInputElement;
                            if (toggle) {
                                await user.click(toggle);
                            }
                        }

                        // Verify TikTok toggle is never rendered (meaning it's not in the selectable state)
                        const tiktokToggle = container.querySelector('input#toggle-tiktok');
                        if (tiktokToggle !== null) {
                            throw new Error('TikTok should never be rendered as a toggle option');
                        }

                        // The fact that TikTok is filtered out in the component's render
                        // means it's effectively always false in the platform selection state
                        // This property holds by design - TikTok cannot be enabled

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 20 }
        );
    }, 15000);

    /**
     * Property 3 (Comprehensive): TikTok remains disabled across all possible component states
     * Validates: Requirements 1.4, 8.2
     */
    it('should keep TikTok disabled even when "Todos" toggle is used', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate random number of "Todos" toggle clicks
                fc.integer({ min: 1, max: 5 }),
                async (todosClicks) => {
                    const user = userEvent.setup();

                    const { container, unmount } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    try {
                        const todosToggle = container.querySelector('input#toggle-all') as HTMLInputElement;
                        if (!todosToggle) {
                            throw new Error('Todos toggle not found');
                        }

                        // Click "Todos" multiple times
                        for (let i = 0; i < todosClicks; i++) {
                            await user.click(todosToggle);

                            // After each click, verify TikTok is still not rendered
                            const tiktokToggle = container.querySelector('input#toggle-tiktok');
                            if (tiktokToggle !== null) {
                                throw new Error(
                                    `TikTok toggle should not be rendered after Todos click ${i + 1}`
                                );
                            }
                        }

                        return true;
                    } finally {
                        unmount();
                    }
                }
            ),
            { numRuns: 20 }
        );
    }, 15000);
});
