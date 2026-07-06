interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 40 }: LogoProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Sage"
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'var(--nova-violet)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--nova-cyan)' }} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#logo-gradient)" />
      <circle cx="24" cy="24" r="10" fill="var(--nova-bg)" fillOpacity="0.85" />
      <circle cx="28" cy="20" r="6" fill="var(--nova-surface)" fillOpacity="0.6" />
    </svg>
  );
}
