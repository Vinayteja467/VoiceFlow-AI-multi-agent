import { motion } from 'framer-motion';
import { Brain, DatabaseZap } from 'lucide-react';
import { Badge, Card, Skeleton } from '../../components/ui';
import { cn } from '../../lib/cn';
import { formatScore, pct } from '../../lib/format';
import { TONES } from '../../lib/agents';
import type { MemoryType, Run } from '../../types';

const MEMORY_TONE: Record<MemoryType, 'research' | 'planning' | 'orchestrator' | 'brand'> = {
  finding: 'research',
  plan: 'planning',
  decision: 'orchestrator',
  fact: 'brand',
};

const MEMORY_DOT: Record<MemoryType, string> = {
  finding: TONES.research.dot,
  plan: TONES.planning.dot,
  decision: TONES.orchestrator.dot,
  fact: 'bg-brand-500',
};

interface RetrievedMemoryPanelProps {
  run?: Run;
}

/** Vector memories retrieved for this run, with similarity bars + consumers. */
export function RetrievedMemoryPanel({ run }: RetrievedMemoryPanelProps) {
  const memories = run?.memories ?? [];
  const maxScore = memories.reduce((max, m) => Math.max(max, m.score), 0) || 1;
  const loading = run?.status === 'running' && memories.length === 0;

  return (
    <Card className="@container flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Brain className="size-4 shrink-0 text-memory" />
        <h2 className="text-sm font-semibold text-ink">Retrieved Memory</h2>
        <Badge tone="outline" mono className="ml-auto">
          top-k 5 · ≥ 0.25
        </Badge>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
        {loading ? (
          <ul className="space-y-2.5">
            {[0, 1].map((i) => (
              <li key={i} className="rounded-xl border border-line bg-surface-1/40 p-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-2 h-1.5 w-full" />
              </li>
            ))}
          </ul>
        ) : memories.length === 0 ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line p-6 text-center">
            <DatabaseZap className="size-6 text-subtle" />
            <p className="max-w-xs text-balance text-xs text-muted">
              {run
                ? 'No memories cleared the similarity threshold — this run started fresh.'
                : 'Memories the orchestrator pulls from Qdrant will appear here, scored for similarity.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {memories.map((memory, i) => (
              <motion.li
                key={memory.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-xl border border-line bg-surface-1/40 p-2.5"
              >
                <div className="flex items-center gap-2">
                  <Badge tone={MEMORY_TONE[memory.type]} mono>
                    {memory.type}
                  </Badge>
                  <span className="ml-auto font-mono text-[0.68rem] tabular-nums text-subtle">
                    {formatScore(memory.score)}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted">{memory.text}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <motion.div
                    className={cn('h-full rounded-full', MEMORY_DOT[memory.type])}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct(memory.score / maxScore)}%` }}
                    transition={{ duration: 0.6, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <span className="text-[0.6rem] uppercase tracking-wide text-subtle">used by</span>
                  <Badge tone="outline" className="text-[0.6rem]">
                    Research
                  </Badge>
                  <Badge tone="outline" className="text-[0.6rem]">
                    Planning
                  </Badge>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
