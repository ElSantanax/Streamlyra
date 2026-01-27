import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { LocalStorageMock } from './mocks';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Setup localStorage mock
beforeEach(() => {
  const localStorageMock = new LocalStorageMock();
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
});

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const mockSocket = {
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  
  return {
    io: vi.fn(() => mockSocket),
  };
});
