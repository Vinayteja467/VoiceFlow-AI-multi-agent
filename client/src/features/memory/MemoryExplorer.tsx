import { motion } from 'framer-motion';
import {
  Brain,
  Check,
  ChevronDown,
  Copy,
  DatabaseZap,
  RefreshCw,
  Search,
  Tags,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState, PageHeader, Stat } from '../../components/layout/PageHeader';
import { Badge, Button, Card, Input, Skeleton } from '../../components/ui';
import { useMemoryList, useMemorySearch } from '../../hooks/queries';
import { cn } from '../../lib/cn';
import { formatScore, pct, relativeTime } from '../../lib/format';
import type { MemoryType } from '../../types';

const TYPES: MemoryType[] = ['finding', 'plan', 'decision', 'fact'];

const TYPE_TONE: Record<MemoryType, 'research' | 'planning' | 'orchestrator' | 'brand'> = {
  finding: 'research',
  plan: 'planning',
  decision: 'orchestrator',
  fact: 'brand',
};

const TYPE_DOT: Record<MemoryType, string> = {
  finding: 'bg-research',
  plan: 'bg-planning',
  decision: 'bg-orchestrator',
  fact: 'bg-brand-500',
};

interface DisplayMemory {
  id: string;
  text: string;
  type: MemoryType;
  tags: string[];
  runId?: string;
  createdAt: string;
  score?: number;
}

export function MemoryExplorer() {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<MemoryType | 'all'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const trimmed = query.trim();
  const searching = trimmed.length >= 2;

  const listQuery = useMemoryList();
  const searchQuery = useMemorySearch(trimmed);

  const raw = useMemo<DisplayMemory[]>(() => {
    if (searching) return searchQuery.data?.results ?? [];
    return listQuery.data?.results ?? [];
  }, [searching, searchQuery.data, listQuery.data]);

  const memories = useMemo(() => {
    const filtered = typeFilter === 'all' ? raw : raw.filter((m) => m.type === typeFilter);
    return [...filtered].sort((a, b) => {
      const cmp = a.createdAt.localeCompare(b.createdAt);
      return sort === 'newest' ? -cmp : cmp;
    });
  }, [raw, typeFilter, sort]);

  const loading = searching ? searchQuery.isLoading : listQuery.isLoading;
  const isError = searching ? searchQuery.isError : listQuery.isError;
  const errorMessage =
    ((searching ? searchQuery.error : listQuery.error) as Error | null)?.message ?? 'The server did not respond.';

  const maxScore = raw.reduce((max, m) => Math.max(max, m.score ?? 0), 0) || 1;
  const provider = (searching ? searchQuery.data?.provider : listQuery.data?.provider) ?? '—';
  const total = listQuery.data?.count ?? raw.length;

  const typeCounts = useMemo(() => {
    const counts: Record<MemoryType, number> = { finding: 0, plan: 0, decision: 0, fact: 0 };
    for (const m of raw) counts[m.type] += 1;
    return counts;
  }, [raw]);

  async function copyMemory(memory: DisplayMemory) {
    try {
      await navigator.clipboard.writeText(memory.text);
      setCopiedId(memory.id);
      toast.success('Memory text copied');
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      toast.error('Clipboard unavailable in this browser.');
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">
      <PageHeader
        icon={Brain}
        title="Memory Explorer"
        description="The shared vector memory every agent reads from and writes to. Search it semantically or browse by type."
        badge={
          <Badge tone="brand" mono size="lg">
            {total} points
          </Badge>
        }
        actions={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => (searching ? searchQuery.refetch() : listQuery.refetch())}
            aria-label="Refresh memories"
          >
            <RefreshCw
              className={cn('size-4', (listQuery.isFetching || searchQuery.isFetching) && 'animate-spin')}
            />
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Stored" value={total} icon={DatabaseZap} tone="brand" />
        <Stat label="Provider" value={<span className="text-sm">{provider}</span>} />
        <Stat label="Findings" value={typeCounts.finding} tone="neutral" />
        <Stat label="Plans" value={typeCounts.plan} tone="neutral" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Semantic search (2+ chars)…"
            aria-label="Search memories"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-surface-1/50 p-1">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            aria-pressed={typeFilter === 'all'}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              typeFilter === 'all' ? 'bg-surface-3 text-ink' : 'text-subtle hover:text-muted',
            )}
          >
            All
          </button>
          {TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(type)}
              aria-pressed={typeFilter === type}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                typeFilter === type ? 'bg-surface-3 text-ink' : 'text-subtle hover:text-muted',
              )}
            >
              <span className={cn('size-1.5 rounded-full', TYPE_DOT[type])} />
              {type}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setSort((s) => (s === 'newest' ? 'oldest' : 'newest'))}
          aria-label="Toggle sort order"
        >
          {sort === 'newest' ? 'Newest first' : 'Oldest first'}
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-line bg-surface-1/40 p-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-5/6" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={Brain}
          title="Couldn’t load memory"
          message={errorMessage}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => (searching ? searchQuery.refetch() : listQuery.refetch())}
            >
              <RefreshCw className="size-4" /> Retry
            </Button>
          }
        />
      ) : memories.length === 0 ? (
        <EmptyState
          icon={DatabaseZap}
          title={searching ? 'No matches' : 'Memory is empty'}
          message={
            searching
              ? `Nothing scored above the threshold for “${trimmed}”. Try a different phrase.`
              : 'Run a workflow — the orchestrator saves findings, plans and decisions here for future runs.'
          }
        />
      ) : (
        <motion.ul layout key={`${typeFilter}-${sort}`} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {memories.map((memory, index) => {
              const isOpen = expanded === memory.id;
              return (
                <motion.li
                  key={memory.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    ease: [0.16, 1, 0.3, 1],
                    delay: Math.min(index * 0.03, 0.15),
                  }}
                  className="min-w-0"
                >
                  <Card variant="solid" className="overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : memory.id)}
                      aria-expanded={isOpen}
                      className="group flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-white/[0.02] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent-400"
                    >
                      <span className={cn('mt-1 size-2.5 shrink-0 rounded-full', TYPE_DOT[memory.type])} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={TYPE_TONE[memory.type]} mono>
                            {memory.type}
                          </Badge>
                          {memory.score != null && (
                            <span className="font-mono text-[0.68rem] tabular-nums text-accent-300">
                              {formatScore(memory.score)}
                            </span>
                          )}
                          <span className="ml-auto shrink-0 text-[0.62rem] text-subtle">
                            {relativeTime(memory.createdAt)}
                          </span>
                          <ChevronDown
                            className={cn(
                              'size-4 shrink-0 text-subtle transition-transform duration-300 group-hover:text-muted',
                              isOpen && 'rotate-180',
                            )}
                          />
                        </span>
                        <span
                          className={cn(
                            'mt-1.5 block text-xs leading-relaxed text-muted',
                            !isOpen && 'line-clamp-3',
                          )}
                        >
                          {memory.text}
                        </span>
                      </span>
                    </button>

                    {isOpen && (
                      <motion.div
                        key="body"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      >
                          <div className="space-y-3 border-t border-line px-3 py-3">
                            {memory.score != null && (
                              <div>
                                <div className="mb-1 flex items-center justify-between text-[0.62rem] text-subtle">
                                  <span>similarity</span>
                                  <span className="font-mono tabular-nums">
                                    {formatScore(memory.score)}
                                  </span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                                  <div
                                    className={cn('h-full rounded-full', TYPE_DOT[memory.type])}
                                    style={{ width: `${pct(memory.score / maxScore)}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {memory.tags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Tags className="size-3.5 text-subtle" />
                                {memory.tags.map((tag) => (
                                  <Badge key={tag} tone="outline" className="text-[0.62rem]">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.62rem] text-subtle">
                              <span>
                                id <span className="font-mono text-muted">{memory.id.slice(0, 10)}</span>
                              </span>
                              <span>
                                created{' '}
                                <span className="font-mono text-muted">
                                  {new Date(memory.createdAt).toLocaleString()}
                                </span>
                              </span>
                              {memory.runId && (
                                <Link
                                  to={`/history?run=${memory.runId}`}
                                  className="font-mono transition-colors hover:text-brand-400"
                                >
                                  run {memory.runId.slice(0, 8)}
                                </Link>
                              )}
                            </div>

                            <Button variant="secondary" size="sm" onClick={() => copyMemory(memory)}>
                              {copiedId === memory.id ? (
                                <Check className="size-4 text-success-500" />
                              ) : (
                                <Copy className="size-4" />
                              )}
                              Copy text
                            </Button>
                          </div>
                      </motion.div>
                    )}
                  </Card>
                </motion.li>
              );
            })}
        </motion.ul>
      )}
    </div>
  );
}
