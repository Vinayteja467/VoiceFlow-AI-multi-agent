import { motion } from 'framer-motion';
import { Check, Copy, Download, Sparkles, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge, Button, Card, Skeleton, Tooltip } from '../../components/ui';
import { runToMarkdown } from '../../lib/markdown';
import type { Run } from '../../types';

interface FinalResponseCardProps {
  run?: Run;
}

/** The orchestrator's merged answer, with Copy + Export-as-Markdown. */
export function FinalResponseCard({ run }: FinalResponseCardProps) {
  const [copied, setCopied] = useState(false);
  const final = run?.finalResponse;
  const loading = run?.status === 'running' && !final;

  async function copy() {
    if (!run) return;
    try {
      await navigator.clipboard.writeText(runToMarkdown(run));
      setCopied(true);
      toast.success('Run summary copied to clipboard');
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Clipboard unavailable in this browser.');
    }
  }

  function exportMarkdown() {
    if (!run) return;
    const blob = new Blob([runToMarkdown(run)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voiceflow-${run.id.slice(0, 8)}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success('Exported as Markdown');
  }

  return (
    <Card className="@container flex h-full flex-col" gradientBorder>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Sparkles className="size-4 shrink-0 text-orchestrator" />
        <h2 className="text-sm font-semibold text-ink">Final Response</h2>
        <div className="ml-auto flex items-center gap-1.5">
          <Tooltip label="Copy run summary (Markdown)">
            <Button variant="ghost" size="icon-sm" onClick={copy} disabled={!run} aria-label="Copy run summary">
              {copied ? <Check className="size-4 text-success-500" /> : <Copy className="size-4" />}
            </Button>
          </Tooltip>
          <Tooltip label="Export as Markdown">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={exportMarkdown}
              disabled={!run}
              aria-label="Export as Markdown"
            >
              <Download className="size-4" />
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="mt-4 h-3 w-1/2" />
          </div>
        ) : !final ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line p-6 text-center">
            <Wand2 className="size-6 text-subtle" />
            <p className="max-w-xs text-balance text-xs text-muted">
              The orchestrator will merge Research, Planning and Task output into one response here.
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-4"
          >
            <h3 className="text-gradient-brand font-display text-lg font-semibold leading-snug">
              {final.headline}
            </h3>

            {final.keyFindings.length > 0 && (
              <section>
                <h4 className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-subtle">
                  Key findings
                </h4>
                <ul className="space-y-1.5">
                  {final.keyFindings.map((item, i) => (
                    <li key={i} className="flex gap-2 text-xs leading-relaxed text-muted">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {final.plan && (
              <section>
                <h4 className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-subtle">
                  Plan
                </h4>
                <p className="whitespace-pre-wrap rounded-lg border border-line bg-surface-1/40 p-2.5 text-xs leading-relaxed text-muted">
                  {final.plan}
                </p>
              </section>
            )}

            {final.nextActions.length > 0 && (
              <section>
                <h4 className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-subtle">
                  Next actions
                </h4>
                <ul className="space-y-1.5">
                  {final.nextActions.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-ink">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-success-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {final.suggestedFollowUps.length > 0 && (
              <section>
                <h4 className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-subtle">
                  Suggested follow-ups
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {final.suggestedFollowUps.map((item, i) => (
                    <Badge key={i} tone="outline" className="text-[0.65rem]">
                      {item}
                    </Badge>
                  ))}
                </div>
              </section>
            )}
          </motion.div>
        )}
      </div>
    </Card>
  );
}
