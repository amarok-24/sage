import { Moon, Sun } from 'lucide-react';
import { useThemeMode } from '../hooks/useThemeMode';
import { cn } from '../lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { mode, toggleMode } = useThemeMode();
  const isDark = mode === 'dark';

  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={cn(
        'min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-colors duration-300',
        'bg-[var(--nova-surface)]/60 border border-[var(--nova-border)] backdrop-blur-xl',
        'text-[var(--nova-text-primary)] hover:border-[var(--nova-violet)]',
        className
      )}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
