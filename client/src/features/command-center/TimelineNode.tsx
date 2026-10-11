import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StatusDot } from '../../components/ui';
import { cn } from '../../lib/cn';
import { TONES, type StepMeta } from '../../lib/agents';
import { formatClock, formatMs } from '../../lib/format';
import type { RunEvent, StepStatus } from '../../types';
import { JsonPanel } from './JsonPanel';

export type DisplayStatus = StepStatus | 'idle' | 'skipped';

const STATUS_TEXT: Record<DisplayStatus, { label: string; className: string }> = {
  idle: { label: 'Idle', className: 'text-subtle' },
  queued: { label: 'Queued', className: 'text-subtle' },
  skipped: { label: 'Skipped', className: 'text-subtle' },
  running: { label: 'Running', className: 'text-accent-400' },
  done: { label: 'Done', className: 'text-success-500' },
  error: { label: 'Error', className: 'text-danger-500' },
};

const DOT_STATUS: Record<DisplayStatus, 'idle' | 'running' | 'done' | 'error'> = {
  idle: 'idle',
  queued: 'idle',
  skipped: 'idle',
  running: 'running',
  done: 'done',
  error: 'error',
};

interface TimelineNodeProps {
  meta: StepMeta;
  status: DisplayStatus;
  event?: RunEvent;
  input: unknown;
  output: unknown;
  index: number;
}

export function TimelineNode({ meta, status, event, input, output, index }: TimelineNodeProps) {
  const [override, setOverride] = useState<boolean | null>(null);
  const tone = TONES[meta.tone];

  // Auto-expand while the step is running; the user can override either way.
  const expanded = override ?? status === 'running';

  useEffect(() => {
    if (status === 'running') setOverride(null);
  }, [status]);

  const Icon = meta.icon;
  const isRunning = status === 'running';

  const card = (
    <div
      className={cn(
        'glass overflow-hidden rounded-2xl transition-colors duration-300',
        isRunning && 'rounded-[calc(1.5rem-1px)]',
        status === 'error' && 'border-danger-500/40',
      )}
    >
      <button
        type="button"
        data-node-header
        aria-expanded={expanded}
        onClick={() => setOverride(!expanded)}
        className={cn(
          'group/node flex w-full items-start gap-3 p-3 text-left',
          'transition-colors hover:bg-white/[0.02] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent-400',
        )}
      >
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-xl border transition-colors',
            tone.bg,
            tone.border,
          )}
        >
          <Icon className={cn('size-5', tone.text)} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-ink">{meta.label}</span>
            <span className={cn('inline-flex items-center gap-1 text-[0.68rem] font-medium', STATUS_TEXT[status].className)}>
              <StatusDot status={DOT_STATUS[status]} />
              {STATUS_TEXT[status].label}
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-2">
              {event?.durationMs != null && (
                <span className="font-mono text-[0.68rem] tabular-nums text-subtle">
                  {formatMs(event.durationMs)}
                </span>
              )}
              <ChevronDown
                className={cn(
                  'size-4 text-subtle transition-transform duration-300 group-hover/node:text-muted',
                  expanded && 'rotate-180',
                )}
              />
            </span>
          </span>
          <span className="mt-1 block text-xs text-muted">
            {event?.message ?? meta.blurb}
          </span>
        </span>
      </button>

      {expanded && (
        <motion.div
          key="body"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className="grid gap-2 px-3 pb-3 @md:grid-cols-2">
              <JsonPanel label="Input" value={input} />
              <JsonPanel label="Output" value={output} />
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-0.5 text-[0.66rem] text-subtle @md:col-span-2">
                <span>
                  agent <span className="font-mono text-muted">{meta.agent}</span>
                </span>
                <span>
                  step <span className="font-mono text-muted">{meta.id}</span>
                </span>
                <span>
                  index <span className="font-mono text-muted">{index}</span>
                </span>
                {event && (
                  <span>
                    at <span className="font-mono text-muted">{formatClock(event.timestamp)}</span>
                  </span>
                )}
              </div>
            </div>
        </motion.div>
      )}
    </div>
  );

  if (!isRunning) return card;

  return (
    <div className="relative overflow-hidden rounded-2xl p-px">
      <div
        aria-hidden="true"
        className="absolute -inset-[60%] animate-spin [animation-duration:3.5s] motion-reduce:animate-none"
        style={{
          backgroundImage: `conic-gradient(from 0deg, transparent 0deg, ${tone.raw} 70deg, transparent 150deg)`,
        }}
      />
      <div className="relative">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-4 top-0 z-10 h-px bg-shimmer" />
        {card}
      </div>
    </div>
  );
}
