import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

if (!globalThis.crypto) {
  globalThis.crypto = {
    randomUUID: () => `test-uuid-${Math.random().toString(36).substr(2, 9)}`,
  } as any;
}

globalThis.fetch = vi.fn();
