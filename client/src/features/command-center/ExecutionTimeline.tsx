import { GitBranch } from 'lucide-react';
import { Fragment, useMemo, useRef, type KeyboardEvent } from 'react';
import { Badge, Card, StatusDot } from '../../components/ui';
import { cn } from '../../lib/cn';
import { STEP_META, STEP_BY_ID, handoffLabel, toneForStep } from '../../lib/agents';
import { formatMs } from '../../lib/format';
import type { Run, RunEvent } from '../../types';
import type { StreamState } from '../../store/runStore';
import { HandoffConnector } from './HandoffConnector';
import { TimelineNode, type DisplayStatus } from './TimelineNode';

interface ExecutionTimelineProps {
  run?: Run;
  streamState: StreamState;
  streamError?: string;
}

const STREAM_LABEL: Record<StreamState, { text: string; status: 'idle' | 'running' | 'done' | 'error' }> = {
  idle: { text: 'Awaiting request', status: 'idle' },
  connecting: { text: 'Connecting…', status: 'running' },
  open: { text: 'Streaming live', status: 'running' },
  closed: { text: 'Run complete', status: 'done' },
  error: { text: 'Disconnected', status: 'error' },
};

export function ExecutionTimeline({ run, streamState, streamError }: ExecutionTimelineProps) {
  const containerRef = useRef<HTMLOListElement>(null);

  const eventByStep = useMemo(() => {
    const map = new Map<string, RunEvent>();
    for (const step of run?.steps ?? []) map.set(step.step, step);
    return map;
  }, [run?.steps]);

  /** Arrow ↑/↓ moves focus between node headers (roving keyboard nav). */
  function onKeyDown(event: KeyboardEvent<HTMLOListElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const buttons = Array.from(
      containerRef.current?.querySelectorAll<HTMLButtonElement>('[data-node-header]') ?? [],
    );
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (current === -1) return;
    event.preventDefault();
    const next = event.key === 'ArrowDown' ? current + 1 : current - 1;
    buttons[Math.max(0, Math.min(next, buttons.length - 1))]?.focus();
  }

  const finished = run && run.status !== 'running';
  const stream = STREAM_LABEL[streamState];

  return (
    <Card className="@container flex h-full flex-col" gradientBorder>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <GitBranch className="size-4 shrink-0 text-brand-400" />
        <h2 className="text-sm font-semibold text-ink">Agent Execution Timeline</h2>
        <span className="ml-auto flex items-center gap-2 text-[0.7rem] text-muted">
          {run?.durationMs != null && finished && (
            <span className="font-mono tabular-nums text-subtle">{formatMs(run.durationMs)}</span>
          )}
          <StatusDot status={stream.status} />
          <span className="hidden sm:inline">{stream.text}</span>
        </span>
      </div>

      {run?.title && (
        <div className="flex items-center gap-2 border-b border-line px-4 py-2">
          <span className="truncate text-xs text-muted" title={run.title}>
            {run.title}
          </span>
          <Badge tone="outline" mono className="ml-auto shrink-0">
            {run.source}
          </Badge>
        </div>
      )}

      <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
        {!run ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line p-8 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-brand-400">
              <GitBranch className="size-6" />
            </span>
            <p className="max-w-xs text-balance text-sm text-muted">
              Start a workflow to watch the orchestrator hand off between agents. Each node expands
              to show its exact input and output.
            </p>
          </div>
        ) : (
          <ol ref={containerRef} className="flex flex-col" onKeyDown={onKeyDown} aria-label="Agent execution steps">
            {STEP_META.map((meta, index) => {
              const event = eventByStep.get(meta.id);
              const status: DisplayStatus = event
                ? event.status
                : finished
                  ? 'skipped'
                  : 'queued';

              const prevMeta = index > 0 ? STEP_META[index - 1] : undefined;
              const prevEvent = prevMeta ? eventByStep.get(prevMeta.id) : undefined;
              const input = prevEvent?.payload ?? (index === 0 ? { request: run.transcript, source: run.source } : undefined);

              return (
                <Fragment key={meta.id}>
                  {index > 0 && (
                    <li>
                      <HandoffConnector
                        label={handoffLabel(meta.id, prevEvent)}
                        tone={toneForStep(meta.id)}
                        active={prevEvent?.status === 'done'}
                      />
                    </li>
                  )}
                  <li>
                    <TimelineNode
                      meta={meta}
                      status={status}
                      event={event}
                      input={input}
                      output={event?.payload}
                      index={index}
                    />
                  </li>
                </Fragment>
              );
            })}
          </ol>
        )}
      </div>

      {streamError && (
        <p
          className={cn(
            'border-t border-line px-4 py-2 text-[0.7rem]',
            streamState === 'error' ? 'text-danger-500' : 'text-subtle',
          )}
        >
          {streamError}
        </p>
      )}
    </Card>
  );
}
