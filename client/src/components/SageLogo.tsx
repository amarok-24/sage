interface SageLogoProps {
  className?: string;
  size?: number;
}

export function SageLogo({ className, size = 32 }: SageLogoProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Sage"
    >
      <circle cx="24" cy="24" r="21" fill="#F0EBE3" />
      <circle cx="24" cy="24" r="15" fill="#87A96B" />
      <circle cx="29" cy="20" r="13" fill="#F0EBE3" />
      <circle cx="24" cy="24" r="18" fill="none" stroke="#2D5016" strokeWidth="2" />
    </svg>
  );
}
