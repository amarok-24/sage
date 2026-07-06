import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import type { SageUser } from './lib/api';

const { mockUser } = vi.hoisted(() => ({
  mockUser: { id: 'user-1', email: 'demo@sage.app', name: 'Demo User' } as SageUser,
}));

vi.mock('./lib/api', async () => {
  const actual = await vi.importActual<typeof import('./lib/api')>('./lib/api');
  return {
    ...actual,
    restoreSession: vi.fn().mockResolvedValue(mockUser),
    setOnAuthFailure: vi.fn(),
  };
});

// Dashboard/DashboardV2 fetch /dashboard/insights on mount; stub it so no real
// network request escapes into the test environment.
global.fetch = vi.fn().mockResolvedValue({ ok: false } as Response);

const VERSION_KEY = 'sage:ui-version';

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('App routing / v1-v2 preference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lands on the classic dashboard at "/" by default', async () => {
    renderApp('/');

    expect(await screen.findByRole('link', { name: /try the new sage experience/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /switch to classic/i })).not.toBeInTheDocument();
  });

  it('lands on the v2 dashboard at "/" once the v2 preference is stored', async () => {
    localStorage.setItem(VERSION_KEY, 'v2');
    renderApp('/');

    expect(await screen.findByRole('button', { name: /switch to classic/i })).toBeInTheDocument();
  });

  it('"/v2" always renders the v2 dashboard and persists the preference', async () => {
    renderApp('/v2');

    expect(await screen.findByRole('button', { name: /switch to classic/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(localStorage.getItem(VERSION_KEY)).toBe('v2');
    });
  });

  it('"/login" renders classic by default and v2 once preference is set', async () => {
    const { unmount } = renderApp('/login');
    expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /switch to classic/i })).not.toBeInTheDocument();
    unmount();

    localStorage.setItem(VERSION_KEY, 'v2');
    renderApp('/login');
    expect(await screen.findByRole('button', { name: /switch to classic/i })).toBeInTheDocument();
  });

  it('"/register" renders classic by default and v2 once preference is set', async () => {
    const { unmount } = renderApp('/register');
    expect(await screen.findByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /switch to classic/i })).not.toBeInTheDocument();
    unmount();

    localStorage.setItem(VERSION_KEY, 'v2');
    renderApp('/register');
    expect(await screen.findByRole('button', { name: /switch to classic/i })).toBeInTheDocument();
  });

  it('switching back to classic from the v2 dashboard immediately updates the rendered page', async () => {
    renderApp('/v2');

    const switchButton = await screen.findByRole('button', { name: /switch to classic/i });
    fireEvent.click(switchButton);

    expect(await screen.findByRole('link', { name: /try the new sage experience/i })).toBeInTheDocument();
    expect(localStorage.getItem(VERSION_KEY)).toBe('v1');
  });
});
