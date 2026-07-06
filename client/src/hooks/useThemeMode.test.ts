import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThemeMode } from './useThemeMode';

const STORAGE_KEY = 'sage:v2-theme-mode';

describe('useThemeMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to dark when nothing is stored', () => {
    const { result } = renderHook(() => useThemeMode());
    expect(result.current.mode).toBe('dark');
  });

  it('reads an existing light preference from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    const { result } = renderHook(() => useThemeMode());
    expect(result.current.mode).toBe('light');
  });

  it('persists a new mode to localStorage and updates state', () => {
    const { result } = renderHook(() => useThemeMode());

    act(() => {
      result.current.setMode('light');
    });

    expect(result.current.mode).toBe('light');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
  });

  it('toggleMode flips between dark and light', () => {
    const { result } = renderHook(() => useThemeMode());

    act(() => {
      result.current.toggleMode();
    });
    expect(result.current.mode).toBe('light');

    act(() => {
      result.current.toggleMode();
    });
    expect(result.current.mode).toBe('dark');
  });

  it('falls back to dark when localStorage throws', () => {
    // Spy directly on the localStorage instance (not Storage.prototype): happy-dom
    // shadows prototype methods with own properties after the first real write,
    // which would make a Storage.prototype spy silently stop intercepting calls.
    const getItemSpy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    const { result } = renderHook(() => useThemeMode());
    expect(result.current.mode).toBe('dark');

    getItemSpy.mockRestore();
  });

  it('syncs the mode across independently mounted hook instances', () => {
    const instanceA = renderHook(() => useThemeMode());
    const instanceB = renderHook(() => useThemeMode());

    act(() => {
      instanceA.result.current.setMode('light');
    });

    expect(instanceA.result.current.mode).toBe('light');
    expect(instanceB.result.current.mode).toBe('light');
  });
});
