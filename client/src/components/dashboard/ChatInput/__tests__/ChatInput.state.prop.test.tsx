import { describe, it, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ChatInput from '../index';
import type { PlatformSelection } from '../../../../types/message.types';

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
 * Property-based tests for ChatInput state management
 * Feature: multi-platform-message-sending
 */
describe('Feature: multi-platform-message-sending, Property 4: Platform selection is stored in state', () => {
    afterEach(() => {
        cleanup();
    });

    /**
     * Property 4: Platform selection is stored in state
     * Validates: Requirements 1.5
     * 
     * This property verifies that when the ChatInput component initializes,
     * the platform selection state is properly stored with the expected default values.
     * 
     * The test verifies that the UI reflects the initial state by checking the
     * defaultChecked prop values of the rendered toggles.
     */
    it('should initialize platform selection state with correct default values', () => {
        fc.assert(
            fc.property(
                fc.constant(null), // We don't need random input for initialization test
                () => {
                    // Render the component
                    const { container } = render(
                        <MemoryRouter>
                            <ChatInput />
                        </MemoryRouter>
                    );

                    // The expected initial state according to requirements
                    const expectedInitialState: PlatformSelection = {
                        twitch: true,
                        youtube: true,
                        kick: true,
                        tiktok: false
                    };

                    // Verify toggles reflect the initial state through their defaultChecked values
                    // Twitch should be checked (enabled by default)
                    const twitchToggle = container.querySelector('input#toggle-twitch') as HTMLInputElement;
                    if (!twitchToggle) {
                        throw new Error('Twitch toggle not found');
                    }
                    // Check the defaultChecked attribute which reflects initial state
                    if (twitchToggle.defaultChecked !== expectedInitialState.twitch) {
                        throw new Error(`Twitch defaultChecked mismatch: expected ${expectedInitialState.twitch}, got ${twitchToggle.defaultChecked}`);
                    }

                    // YouTube should be checked (enabled by default)
                    const youtubeToggle = container.querySelector('input#toggle-youtube') as HTMLInputElement;
                    if (!youtubeToggle) {
                        throw new Error('YouTube toggle not found');
                    }
                    if (youtubeToggle.defaultChecked !== expectedInitialState.youtube) {
                        throw new Error(`YouTube defaultChecked mismatch: expected ${expectedInitialState.youtube}, got ${youtubeToggle.defaultChecked}`);
                    }

                    // Kick should be checked and enabled
                    const kickToggle = container.querySelector('input#toggle-kick') as HTMLInputElement;
                    if (!kickToggle) {
                        throw new Error('Kick toggle not found');
                    }
                    if (kickToggle.defaultChecked !== expectedInitialState.kick) {
                        throw new Error(`Kick defaultChecked mismatch: expected ${expectedInitialState.kick}, got ${kickToggle.defaultChecked}`);
                    }
                    if (kickToggle.disabled) {
                        throw new Error('Kick toggle should be enabled');
                    }

                    // TikTok should not be rendered (filtered out in the component)
                    const tiktokToggle = container.querySelector('input#toggle-tiktok');
                    if (tiktokToggle !== null) {
                        throw new Error('TikTok toggle should not be rendered');
                    }

                    // Clean up after this iteration
                    cleanup();

                    // Property holds: state is initialized correctly and reflected in UI
                    return true;
                }
            ),
            { numRuns: 20 }
        );
    });

    /**
     * Property 4 (Extended): Platform selection state persists across multiple renders
     * Validates: Requirements 1.5
     * 
     * This property verifies that the state initialization is consistent
     * across multiple component instantiations.
     */
    it('should consistently initialize state across multiple renders', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 10 }), // Number of times to render
                (renderCount) => {
                    const results: boolean[] = [];

                    // Render the component multiple times
                    for (let i = 0; i < renderCount; i++) {
                        const { container } = render(
                            <MemoryRouter>
                                <ChatInput />
                            </MemoryRouter>
                        );

                        // Check if initial state is correct by examining defaultChecked
                        const twitchToggle = container.querySelector('input#toggle-twitch') as HTMLInputElement;
                        const youtubeToggle = container.querySelector('input#toggle-youtube') as HTMLInputElement;
                        const kickToggle = container.querySelector('input#toggle-kick') as HTMLInputElement;
                        const tiktokToggle = container.querySelector('input#toggle-tiktok');

                        const isCorrect =
                            twitchToggle !== null &&
                            twitchToggle.defaultChecked === true &&
                            youtubeToggle !== null &&
                            youtubeToggle.defaultChecked === true &&
                            kickToggle !== null &&
                            kickToggle.defaultChecked === true &&
                            kickToggle.disabled === false &&
                            tiktokToggle === null;

                        results.push(isCorrect);

                        // Clean up after each render
                        cleanup();
                    }

                    // Property holds: all renders have consistent initial state
                    return results.every(result => result === true);
                }
            ),
            { numRuns: 20 }
        );
    });
});
