import { vi } from 'vitest';

type MediaListener = (event: MediaQueryListEvent) => void;

export function installMatchMediaMock(initialMatches = false) {
  let matches = initialMatches;
  const listeners = new Set<MediaListener>();

  const matchMediaMock = vi.fn().mockImplementation((query: string) => {
    return {
      get matches() {
        return matches;
      },
      media: query,
      onchange: null,
      addEventListener: (_eventName: string, listener: MediaListener) => {
        listeners.add(listener);
      },
      removeEventListener: (_eventName: string, listener: MediaListener) => {
        listeners.delete(listener);
      },
      addListener: (listener: MediaListener) => {
        listeners.add(listener);
      },
      removeListener: (listener: MediaListener) => {
        listeners.delete(listener);
      },
      dispatchEvent: vi.fn(),
    };
  });

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMediaMock,
  });

  return {
    matchMediaMock,
    setMatches(nextMatches: boolean) {
      matches = nextMatches;
      const event = { matches: nextMatches } as MediaQueryListEvent;

      listeners.forEach((listener) => listener(event));
    },
  };
}
