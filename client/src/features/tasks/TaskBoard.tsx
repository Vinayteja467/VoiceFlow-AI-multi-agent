import { motion } from 'framer-motion';
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ListTodo,
  RefreshCw,
  Search,
  UserRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState, PageHeader, Stat } from '../../components/layout/PageHeader';
import { Badge, Button, Card, Input, Skeleton } from '../../components/ui';
import { useTasks, useUpdateTask } from '../../hooks/queries';
import { cn } from '../../lib/cn';
import { relativeTime } from '../../lib/format';
import type { Priority, Task, TaskStatus } from '../../types';

const COLUMNS: { id: TaskStatus; label: string; dot: string; ring: string }[] = [
  { id: 'pending', label: 'To do', dot: 'bg-subtle', ring: 'border-line' },
  { id: 'in_progress', label: 'In progress', dot: 'bg-accent-400', ring: 'border-accent-500/40' },
  { id: 'done', label: 'Done', dot: 'bg-success-500', ring: 'border-success-500/40' },
];

const STATUS_ORDER: TaskStatus[] = ['pending', 'in_progress', 'done'];

const PRIORITY_TONE: Record<Priority, 'danger' | 'warn' | 'neutral'> = {
  P0: 'danger',
  P1: 'warn',
  P2: 'neutral',
};

export function TaskBoard() {
  const tasksQuery = useTasks();
  const updateTask = useUpdateTask();

  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState<Priority | 'all'>('all');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  const tasks = tasksQuery.data?.tasks ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (priority !== 'all' && task.priority !== priority) return false;
      if (!q) return true;
      return `${task.title} ${task.owner} ${task.dependsOn.join(' ')}`.toLowerCase().includes(q);
    });
  }, [tasks, query, priority]);

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { pending: [], in_progress: [], done: [] };
    for (const task of filtered) map[task.status]?.push(task);
    return map;
  }, [filtered]);

  const counts = useMemo(
    () => ({
      pending: tasks.filter((t) => t.status === 'pending').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      done: tasks.filter((t) => t.status === 'done').length,
    }),
    [tasks],
  );

  function applyStatus(task: Task, status: TaskStatus) {
    if (task.status === status) return;
    updateTask.mutate(
      { id: task.id, patch: { status } },
      {
        onSuccess: () =>
          toast.success(`Moved to ${status.replace('_', ' ')} — “${task.title.slice(0, 40)}”`),
        onError: (err) => toast.error(`Could not update task: ${(err as Error).message}`),
      },
    );
  }

  function move(task: Task, delta: number) {
    const index = STATUS_ORDER.indexOf(task.status);
    const next = STATUS_ORDER[Math.max(0, Math.min(STATUS_ORDER.length - 1, index + delta))];
    if (next) applyStatus(task, next);
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">
      <PageHeader
        icon={ListTodo}
        title="Task Board"
        description="Every task the Task agent produced, across all runs. Drag a card between columns — or use the arrows — to move it."
        badge={
          <Badge tone="brand" mono size="lg">
            {tasks.length} tasks
          </Badge>
        }
        actions={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => tasksQuery.refetch()}
            aria-label="Refresh tasks"
          >
            <RefreshCw className={cn('size-4', tasksQuery.isFetching && 'animate-spin')} />
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Total" value={tasks.length} icon={ListTodo} tone="brand" />
        <Stat label="To do" value={counts.pending} />
        <Stat label="In progress" value={counts.in_progress} tone="accent" />
        <Stat label="Done" value={counts.done} tone="success" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter tasks…"
            aria-label="Filter tasks"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-line bg-surface-1/50 p-1">
          {(['all', 'P0', 'P1', 'P2'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPriority(option)}
              aria-pressed={priority === option}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                priority === option ? 'bg-surface-3 text-ink' : 'text-subtle hover:text-muted',
              )}
            >
              {option === 'all' ? 'All priorities' : option}
            </button>
          ))}
        </div>
      </div>

      {tasksQuery.isLoading ? (
        <div className="grid gap-3 lg:grid-cols-3">
          {COLUMNS.map((column) => (
            <div key={column.id} className="rounded-2xl border border-line bg-surface-1/30 p-2.5">
              <Skeleton className="mb-3 h-5 w-24" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : tasksQuery.isError ? (
        <EmptyState
          icon={ListTodo}
          title="Couldn’t load tasks"
          message={(tasksQuery.error as Error)?.message ?? 'The server did not respond.'}
          action={
            <Button variant="secondary" size="sm" onClick={() => tasksQuery.refetch()}>
              <RefreshCw className="size-4" /> Retry
            </Button>
          }
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks yet"
          message="Start a workflow in the Command Center — the Task agent writes its tasks here automatically."
          action={
            <Button size="sm" onClick={() => tasksQuery.refetch()}>
              <RefreshCw className="size-4" /> Check again
            </Button>
          }
        />
      ) : (
        <div className="grid items-start gap-3 lg:grid-cols-3">
          {COLUMNS.map((column) => {
            const items = byStatus[column.id];
            return (
              <section
                key={column.id}
                aria-label={column.label}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(column.id);
                }}
                onDragLeave={() => setDragOver((c) => (c === column.id ? null : c))}
                onDrop={(event) => {
                  event.preventDefault();
                  const id = event.dataTransfer.getData('text/plain');
                  const task = tasks.find((t) => t.id === id);
                  if (task) applyStatus(task, column.id);
                  setDragOver(null);
                  setDragId(null);
                }}
                className={cn(
                  'flex min-w-0 flex-col rounded-2xl border bg-surface-1/30 p-2.5 transition-colors',
                  column.ring,
                  dragOver === column.id && 'bg-surface-2/60 ring-2 ring-accent-400/40',
                )}
              >
                <div className="mb-2.5 flex items-center gap-2 px-1">
                  <span className={cn('size-2 rounded-full', column.dot)} />
                  <h2 className="text-sm font-semibold text-ink">{column.label}</h2>
                  <span className="ml-auto font-mono text-xs tabular-nums text-subtle">
                    {items.length}
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-line px-4 py-8 text-center">
                    <Inbox className="size-5 text-subtle" />
                    <p className="text-[0.7rem] text-subtle">Nothing here</p>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {items.map((task) => (
                      <motion.li key={task.id} layout>
                        <Card
                          variant="solid"
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData('text/plain', task.id);
                            event.dataTransfer.effectAllowed = 'move';
                            setDragId(task.id);
                          }}
                          onDragEnd={() => setDragId(null)}
                          className={cn(
                            'group cursor-grab p-3 transition-shadow hover:shadow-e2 active:cursor-grabbing',
                            dragId === task.id && 'opacity-50',
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            <Badge tone={PRIORITY_TONE[task.priority]} mono>
                              {task.priority}
                            </Badge>
                            {task.dependsOn.length > 0 && (
                              <Badge tone="outline" mono>
                                dep · {task.dependsOn.length}
                              </Badge>
                            )}
                            <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Move “${task.title}” left`}
                                onClick={() => move(task, -1)}
                                disabled={task.status === 'pending'}
                              >
                                <ChevronLeft className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Move “${task.title}” right`}
                                onClick={() => move(task, 1)}
                                disabled={task.status === 'done'}
                              >
                                <ChevronRight className="size-4" />
                              </Button>
                            </div>
                          </div>

                          <p className="mt-2 text-sm font-medium leading-snug text-ink">
                            {task.title}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] text-subtle">
                            <span className="inline-flex items-center gap-1">
                              <UserRound className="size-3" />
                              {task.owner || 'unassigned'}
                            </span>
                            {task.due && (
                              <span className="inline-flex items-center gap-1">
                                <CalendarClock className="size-3" />
                                {task.due}
                              </span>
                            )}
                          </div>

                          {task.dependsOn.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {task.dependsOn.map((dep) => (
                                <span
                                  key={dep}
                                  className="rounded border border-line bg-surface-2/60 px-1.5 py-0.5 font-mono text-[0.6rem] text-subtle"
                                >
                                  {dep.slice(0, 8)}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="mt-2.5 flex items-center gap-2 border-t border-line pt-2">
                            <Link
                              to={`/history?run=${task.runId}`}
                              className="font-mono text-[0.6rem] text-subtle transition-colors hover:text-brand-400"
                            >
                              run {task.runId.slice(0, 8)}
                            </Link>
                            <span className="ml-auto text-[0.6rem] text-subtle">
                              {relativeTime(task.createdAt)}
                            </span>
                          </div>
                        </Card>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
