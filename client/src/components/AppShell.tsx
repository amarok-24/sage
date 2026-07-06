import { useEffect, type ReactNode } from 'react';
import { useThemeMode } from '../hooks/useThemeMode';
import { ThemeToggle } from './ThemeToggle';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { mode } = useThemeMode();

  // Kept in sync on <html> (rather than a wrapper div here) so the --nova-*
  // theme vars are available app-wide, including to ProtectedRoute's loading
  // spinner, which renders before AppShell ever mounts.
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden bg-[var(--nova-bg)] transition-colors duration-500"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-30"
      >
        <div className="absolute -top-1/4 -left-1/4 w-2/3 h-2/3 rounded-full bg-gradient-to-br from-[var(--nova-violet)] to-transparent blur-3xl animate-gradient-pan" />
        <div className="absolute -bottom-1/4 -right-1/4 w-2/3 h-2/3 rounded-full bg-gradient-to-br from-[var(--nova-cyan)] to-transparent blur-3xl animate-gradient-pan" />
      </div>

      <div className="fixed top-4 right-4 z-20 flex items-center gap-2">
        <ThemeToggle />
      </div>

      <div className="relative z-10 px-4 sm:px-6 md:px-8 py-12">{children}</div>
    </div>
  );
}
