import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SwitchToClassicLink } from './SwitchToClassicLink';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const STORAGE_KEY = 'sage:ui-version';

describe('SwitchToClassicLink', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    localStorage.setItem(STORAGE_KEY, 'v2');
  });

  it('sets the preference back to v1 and navigates to the given fallback path', () => {
    render(
      <MemoryRouter>
        <SwitchToClassicLink fallbackPath="/login" />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /switch to classic/i }));

    expect(localStorage.getItem(STORAGE_KEY)).toBe('v1');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
