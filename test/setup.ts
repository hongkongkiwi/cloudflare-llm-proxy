// Test setup file
import { beforeAll, afterAll, vi } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Store the original console
const originalConsole = console;

beforeAll(() => {
  // Mock console methods to reduce noise in tests
  (global as any).console = {
    ...originalConsole,
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };
});

afterAll(() => {
  // Restore original console
  (global as any).console = originalConsole;
});