import { useEffect, type ReactNode } from 'react';
import { useUIVersion } from '../../hooks/useUIVersion';
import { useThemeMode } from '../../hooks/useThemeMode';
import { ThemeToggle } from './ThemeToggle';
import { SwitchToClassicLink } from './SwitchToClassicLink';

interface NovaShellProps {
  children: ReactNode;
  fallbackPath: string;
}

export function NovaShell({ children, fallbackPath }: NovaShellProps) {
  const { setVersion } = useUIVersion();
  const { mode } = useThemeMode();

  useEffect(() => {
    setVersion('v2');
  }, [setVersion]);

  return (
    <div
      data-nova-theme={mode}
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
        <div className="absolute -top-1/4 -left-1/4 w-2/3 h-2/3 rounded-full bg-gradient-to-br from-[var(--nova-violet)] to-transparent blur-3xl animate-nova-gradient" />
        <div className="absolute -bottom-1/4 -right-1/4 w-2/3 h-2/3 rounded-full bg-gradient-to-br from-[var(--nova-cyan)] to-transparent blur-3xl animate-nova-gradient" />
      </div>

      <div className="fixed top-4 right-4 z-20 flex items-center gap-2">
        <ThemeToggle />
        <SwitchToClassicLink fallbackPath={fallbackPath} />
      </div>

      <div className="relative z-10 px-4 sm:px-6 md:px-8 py-12">{children}</div>
    </div>
  );
}
