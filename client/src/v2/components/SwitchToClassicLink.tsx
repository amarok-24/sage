import { useNavigate } from 'react-router-dom';
import { useUIVersion } from '../../hooks/useUIVersion';
import { cn } from '../../lib/utils';

interface SwitchToClassicLinkProps {
  fallbackPath: string;
  className?: string;
}

export function SwitchToClassicLink({ fallbackPath, className }: SwitchToClassicLinkProps) {
  const { setVersion } = useUIVersion();
  const navigate = useNavigate();

  const handleClick = () => {
    setVersion('v1');
    navigate(fallbackPath);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'min-h-[44px] px-4 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-300',
        'bg-[var(--nova-surface)]/60 border border-[var(--nova-border)] backdrop-blur-xl',
        'text-[var(--nova-text-muted)] hover:text-[var(--nova-text-primary)] hover:border-[var(--nova-violet)]',
        className
      )}
    >
      Switch to classic
    </button>
  );
}
