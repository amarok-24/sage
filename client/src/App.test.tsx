import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

// Dashboard fetches /dashboard/insights on mount; stub it so no real
// network request escapes into the test environment.
global.fetch = vi.fn().mockResolvedValue({ ok: false } as Response);

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

describe('App routing', () => {
  it('renders the dashboard at "/" once authenticated', async () => {
    renderApp('/');

    expect(await screen.findByText(/Grow your awareness\./i)).toBeInTheDocument();
  });

  it('renders the login page at "/login"', async () => {
    renderApp('/login');

    expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders the register page at "/register"', async () => {
    renderApp('/register');

    expect(await screen.findByRole('button', { name: /create account/i })).toBeInTheDocument();
  });
});
