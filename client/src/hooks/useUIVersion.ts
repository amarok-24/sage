import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'sage:ui-version';

export type UIVersion = 'v1' | 'v2';

const listeners = new Set<() => void>();

function readStoredVersion(): UIVersion {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'v2' ? 'v2' : 'v1';
  } catch {
    return 'v1';
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function useUIVersion() {
  const version = useSyncExternalStore(subscribe, readStoredVersion, () => 'v1' as UIVersion);

  const setVersion = useCallback((next: UIVersion) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (e.g. Safari private mode) - preference just won't persist
    }
    emitChange();
  }, []);

  return { version, setVersion };
}
