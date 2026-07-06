import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUIVersion } from './useUIVersion';

const STORAGE_KEY = 'sage:ui-version';

describe('useUIVersion', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to v1 when nothing is stored', () => {
    const { result } = renderHook(() => useUIVersion());
    expect(result.current.version).toBe('v1');
  });

  it('reads an existing v2 preference from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'v2');
    const { result } = renderHook(() => useUIVersion());
    expect(result.current.version).toBe('v2');
  });

  it('persists a new preference to localStorage and updates state', () => {
    const { result } = renderHook(() => useUIVersion());

    act(() => {
      result.current.setVersion('v2');
    });

    expect(result.current.version).toBe('v2');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('v2');
  });

  it('falls back to v1 when localStorage throws', () => {
    // Spy directly on the localStorage instance (not Storage.prototype): happy-dom
    // shadows prototype methods with own properties after the first real write,
    // which would make a Storage.prototype spy silently stop intercepting calls.
    const getItemSpy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    const { result } = renderHook(() => useUIVersion());
    expect(result.current.version).toBe('v1');

    getItemSpy.mockRestore();
  });

  it('does not throw when setVersion is called and localStorage.setItem throws, and stays on v1 since the write never persisted', () => {
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    const { result } = renderHook(() => useUIVersion());

    expect(() => {
      act(() => {
        result.current.setVersion('v2');
      });
    }).not.toThrow();
    expect(result.current.version).toBe('v1');

    setItemSpy.mockRestore();
  });

  it('syncs the preference across independently mounted hook instances', () => {
    const instanceA = renderHook(() => useUIVersion());
    const instanceB = renderHook(() => useUIVersion());

    act(() => {
      instanceA.result.current.setVersion('v2');
    });

    expect(instanceA.result.current.version).toBe('v2');
    expect(instanceB.result.current.version).toBe('v2');
  });
});
