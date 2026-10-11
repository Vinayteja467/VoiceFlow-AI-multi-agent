import { cn } from '../../lib/cn';

interface ProgressRingProps {
  /** 0..1 */
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  trackClassName?: string;
  indicatorClassName?: string;
  children?: React.ReactNode;
  label?: string;
}

/** Accessible circular progress meter. */
export function ProgressRing({
  value,
  size = 44,
  stroke = 4,
  className,
  trackClassName,
  indicatorClassName,
  children,
  label,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={cn('stroke-surface-3', trackClassName)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            'stroke-brand-500 transition-[stroke-dashoffset] duration-500 ease-out-expo motion-reduce:transition-none',
            indicatorClassName,
          )}
        />
      </svg>
      {children && (
        <span className="absolute inset-0 flex items-center justify-center text-[0.7rem] font-semibold tabular-nums text-ink">
          {children}
        </span>
      )}
    </div>
  );
}
