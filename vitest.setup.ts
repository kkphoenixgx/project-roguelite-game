import { vi } from 'vitest';
if (typeof window === 'undefined') {
  global.window = {} as any;
}
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue({})
}));
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(undefined)
}));
