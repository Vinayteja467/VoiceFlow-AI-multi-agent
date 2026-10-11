import { Waypoints } from 'lucide-react';
import { cn } from '../../lib/cn';

interface LogoProps {
  compact?: boolean;
  className?: string;
}

export function Logo({ compact = false, className }: LogoProps) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand-500 to-accent-500 text-white shadow-glow-brand">
        <Waypoints className="size-5" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-sm font-semibold tracking-tight text-ink">
            VoiceFlow<span className="text-accent-400"> AI</span>
          </span>
          <span className="mt-0.5 text-[0.65rem] font-medium uppercase tracking-[0.16em] text-subtle">
            multi-agent
          </span>
        </span>
      )}
    </span>
  );
}
