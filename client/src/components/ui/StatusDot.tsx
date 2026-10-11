import { cn } from '../../lib/cn';

type StatusTone = 'idle' | 'running' | 'done' | 'error' | 'queued';

const toneClass: Record<StatusTone, string> = {
  idle: 'bg-subtle',
  queued: 'bg-subtle',
  running: 'bg-accent-400',
  done: 'bg-success-500',
  error: 'bg-danger-500',
};

const label: Record<StatusTone, string> = {
  idle: 'Idle',
  queued: 'Queued',
  running: 'Running',
  done: 'Done',
  error: 'Error',
};

interface StatusDotProps {
  status?: StatusTone;
  className?: string;
  pulse?: boolean;
  labelVisible?: boolean;
}

/** Small status indicator with an optional pulsing halo while active. */
export function StatusDot({ status = 'idle', className, pulse, labelVisible }: StatusDotProps) {
  const shouldPulse = pulse ?? status === 'running';
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="relative inline-flex size-2">
        {shouldPulse && (
          <span
            className={cn(
              'absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:animate-none',
              toneClass[status],
            )}
          />
        )}
        <span className={cn('relative inline-flex size-2 rounded-full', toneClass[status])} />
      </span>
      {labelVisible && <span className="text-xs text-muted">{label[status]}</span>}
      <span className="sr-only">{label[status]}</span>
    </span>
  );
}
