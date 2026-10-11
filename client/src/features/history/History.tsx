import { motion } from 'framer-motion';
import {
  Clock,
  History as HistoryIcon,
  RefreshCw,
  RotateCcw,
  SquareStack,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState, PageHeader, Stat } from '../../components/layout/PageHeader';
import { Badge, Button, Card, Skeleton, StatusDot } from '../../components/ui';
import { useRuns } from '../../hooks/queries';
import { cn } from '../../lib/cn';
import { formatMs, relativeTime } from '../../lib/format';
import type { StreamState } from '../../store/runStore';
import type { Run, RunEvent, RunStatus } from '../../types';
import { ExecutionTimeline } from '../command-center/ExecutionTimeline';
import { FinalResponseCard } from '../command-center/FinalResponseCard';

const RUN_DOT: Record<RunStatus, 'running' | 'done' | 'error'> = {
  running: 'running',
  done: 'done',
  error: 'error',
};

const RUN_TONE: Record<RunStatus, 'brand' | 'success' | 'danger'> = {
  running: 'brand',
  done: 'success',
  error: 'danger',
};

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function upsertStep(steps: RunEvent[], event: RunEvent): RunEvent[] {
  const index = steps.findIndex((s) => s.step === event.step && s.agent === event.agent);
  if (index >= 0) {
    const next = steps.slice();
    next[index] = event;
    return next;
  }
  return [...steps, event];
}

export function HistoryPage() {
  const runsQuery = useRuns();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('run');

  const runs = runsQuery.data?.runs ?? [];
  const selected = runs.find((run) => run.id === selectedId);

  const [replay, setReplay] = useState<Run | null>(null);
  const [replaying, setReplaying] = useState(false);
  const token = useRef(0);

  // Selecting a different run cancels any in-flight replay.
  useEffect(() => {
    token.current += 1;
    setReplay(null);
    setReplaying(false);
  }, [selectedId]);

  // Default to the newest run when nothing (or an unknown id) is selected.
  useEffect(() => {
    if (runs.length === 0) return;
    if (!selectedId || !runs.some((run) => run.id === selectedId)) {
      setParams({ run: runs[0]!.id }, { replace: true });
    }
  }, [runs, selectedId, setParams]);

  const stats = useMemo(() => {
    const done = runs.filter((r) => r.status === 'done');
    const durations = done.map((r) => r.durationMs ?? 0).filter((n) => n > 0);
    const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    return {
      total: runs.length,
      done: done.length,
      error: runs.filter((r) => r.status === 'error').length,
      avg,
    };
  }, [runs]);

  async function startReplay(run: Run) {
    const myToken = ++token.current;
    setReplaying(true);
    setReplay({ ...run, status: 'running', steps: [], durationMs: undefined });
    for (const step of run.steps) {
      if (token.current !== myToken) return;
      setReplay((prev) =>
        prev
          ? { ...prev, steps: upsertStep(prev.steps, { ...step, status: 'running', durationMs: undefined }) }
          : prev,
      );
      await sleep(240);
      if (token.current !== myToken) return;
      setReplay((prev) => (prev ? { ...prev, steps: upsertStep(prev.steps, step) } : prev));
      await sleep(90);
    }
    if (token.current !== myToken) return;
    setReplay((prev) => (prev ? { ...prev, status: run.status, durationMs: run.durationMs } : prev));
    setReplaying(false);
  }

  const displayRun = replay ?? selected;
  const streamState: StreamState = replaying ? 'open' : 'closed';

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">
      <PageHeader
        icon={HistoryIcon}
        title="History"
        description="Every run the orchestrator has executed, newest first. Pick one to replay its full agent timeline."
        badge={
          <Badge tone="brand" mono size="lg">
            {stats.total} runs
          </Badge>
        }
        actions={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => runsQuery.refetch()}
            aria-label="Refresh runs"
          >
            <RefreshCw className={cn('size-4', runsQuery.isFetching && 'animate-spin')} />
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Total runs" value={stats.total} icon={SquareStack} tone="brand" />
        <Stat label="Completed" value={stats.done} tone="success" />
        <Stat label="Failed" value={stats.error} tone="danger" />
        <Stat
          label="Avg duration"
          value={<span className="text-sm">{stats.avg ? formatMs(stats.avg) : '—'}</span>}
          icon={Clock}
        />
      </div>

      {runsQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      ) : runsQuery.isError ? (
        <EmptyState
          icon={HistoryIcon}
          title="Couldn’t load run history"
          message={(runsQuery.error as Error)?.message ?? 'The server did not respond.'}
          action={
            <Button variant="secondary" size="sm" onClick={() => runsQuery.refetch()}>
              <RefreshCw className="size-4" /> Retry
            </Button>
          }
        />
      ) : runs.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No runs yet"
          message="Start a workflow in the Command Center and it will show up here with its full timeline."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <ul className="scrollbar-thin flex max-h-[70vh] flex-col gap-2 lg:overflow-y-auto">
            {runs.map((run) => (
              <li key={run.id}>
                <button
                  type="button"
                  onClick={() => setParams({ run: run.id })}
                  aria-current={run.id === selectedId}
                  className={cn(
                    'w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400',
                    run.id === selectedId
                      ? 'border-brand-500/40 bg-surface-2'
                      : 'border-line bg-surface-1/40 hover:bg-surface-2/60',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <StatusDot status={RUN_DOT[run.status]} />
                    <span className="truncate text-sm font-medium text-ink">{run.title}</span>
                    <Badge tone="outline" mono size="sm" className="ml-auto shrink-0">
                      {run.source}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-1 text-[0.7rem] text-subtle">{run.transcript}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-[0.62rem] text-subtle">
                    <span>{relativeTime(run.createdAt)}</span>
                    <span>{run.steps.length} steps</span>
                    {run.durationMs != null && (
                      <span className="font-mono tabular-nums">{formatMs(run.durationMs)}</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {displayRun ? (
            <div className="flex min-w-0 flex-col gap-4">
              <Card variant="solid" className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-ink">{displayRun.title}</h2>
                  <Badge tone={RUN_TONE[displayRun.status]} mono>
                    {displayRun.status}
                  </Badge>
                  <Badge tone="outline" mono>
                    {displayRun.source}
                  </Badge>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="ml-auto"
                    onClick={() => startReplay(selected ?? displayRun)}
                    disabled={replaying}
                  >
                    <RotateCcw className={cn('size-4', replaying && 'animate-spin')} />
                    {replaying ? 'Replaying…' : 'Replay'}
                  </Button>
                </div>

                <p className="mt-3 whitespace-pre-wrap rounded-lg border border-line bg-surface-1/40 p-2.5 text-xs leading-relaxed text-muted">
                  {displayRun.transcript}
                </p>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.62rem] text-subtle">
                  <span>
                    id <span className="font-mono text-muted">{displayRun.id.slice(0, 10)}</span>
                  </span>
                  <span>
                    started{' '}
                    <span className="font-mono text-muted">
                      {new Date(displayRun.createdAt).toLocaleString()}
                    </span>
                  </span>
                  <span>
                    steps <span className="font-mono text-muted">{displayRun.steps.length}</span>
                  </span>
                  {displayRun.durationMs != null && (
                    <span>
                      took{' '}
                      <span className="font-mono tabular-nums text-muted">
                        {formatMs(displayRun.durationMs)}
                      </span>
                    </span>
                  )}
                </div>

                {displayRun.error && (
                  <p className="mt-3 rounded-lg border border-danger-500/30 bg-danger-500/10 p-2.5 text-xs text-danger-500">
                    {displayRun.error}
                  </p>
                )}
              </Card>

              <motion.div layout>
                <ExecutionTimeline run={displayRun} streamState={streamState} />
              </motion.div>

              <FinalResponseCard run={displayRun} />
            </div>
          ) : (
            <EmptyState
              icon={HistoryIcon}
              title="Select a run"
              message="Choose a run from the list to inspect its timeline and final response."
            />
          )}
        </div>
      )}
    </div>
  );
}
