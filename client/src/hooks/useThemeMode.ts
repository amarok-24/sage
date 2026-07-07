import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'sage:v2-theme-mode';

export type ThemeMode = 'dark' | 'light';

const listeners = new Set<() => void>();

function readStoredMode(): ThemeMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
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

export function useThemeMode() {
  const mode = useSyncExternalStore(subscribe, readStoredMode, () => 'light' as ThemeMode);

  const setMode = useCallback((next: ThemeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (e.g. Safari private mode) - preference just won't persist
    }
    emitChange();
  }, []);

  const toggleMode = useCallback(() => {
    setMode(readStoredMode() === 'dark' ? 'light' : 'dark');
  }, [setMode]);

  return { mode, setMode, toggleMode };
}
