import { Loader2, Play, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge, Button, Card } from '../../components/ui';
import { useStartRun } from '../../hooks/queries';
import { useRunStream } from '../../hooks/useRunStream';
import { useActiveRun, useRunStore } from '../../store/runStore';
import { useUiStore } from '../../store/uiStore';
import type { VoiceSource } from '../../types';
import { EXAMPLE_PROMPTS } from './examples';
import { ExecutionTimeline } from './ExecutionTimeline';
import { FinalResponseCard } from './FinalResponseCard';
import { RetrievedMemoryPanel } from './RetrievedMemoryPanel';
import { VoiceOrb } from './VoiceOrb';

export function CommandCenter() {
  const activeRunId = useRunStore((s) => s.activeRunId);
  const streamState = useRunStore((s) => s.streamState);
  const streamError = useRunStore((s) => s.streamError);
  const run = useActiveRun();
  const source = useUiStore((s) => s.source);
  const startRun = useStartRun();

  // Subscribe to the active run's SSE stream (reconnect handled in the hook).
  useRunStream(activeRunId);

  const [text, setText] = useState('');

  const submit = useCallback(
    (value: string, submitSource: VoiceSource = source) => {
      const trimmed = value.trim();
      if (!trimmed) {
        toast.error('Enter or speak a request first.');
        return;
      }
      setText(trimmed);
      startRun.mutate(
        { text: trimmed, source: submitSource },
        {
          onSuccess: () => toast.success('Workflow started — streaming the pipeline'),
          onError: (err) => toast.error(`Could not start the workflow: ${(err as Error).message}`),
        },
      );
    },
    [source, startRun],
  );

  // Command palette can kick off the example run.
  useEffect(() => {
    const handler = () => {
      const example = EXAMPLE_PROMPTS[0];
      if (example) submit(example.text, 'text');
    };
    window.addEventListener('voiceflow:example', handler);
    return () => window.removeEventListener('voiceflow:example', handler);
  }, [submit]);

  const processing = run?.status === 'running';

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-fluid-hero font-semibold text-ink">Command Center</h1>
          <Badge tone="brand" mono size="lg">
            multi-agent
          </Badge>
        </div>
        <p className="max-w-2xl text-balance text-sm text-muted">
          One spoken instruction becomes a completed workflow. The orchestrator delegates to
          Research, Planning and Task agents that collaborate over a shared vector-memory store.
        </p>
      </div>

      <div className="cc-bento">
        <section style={{ gridArea: 'voice' }} className="min-w-0">
          <VoiceOrb onResult={(value) => submit(value, source)} processing={processing} />
        </section>

        <section style={{ gridArea: 'input' }} className="min-w-0">
          <Card className="@container flex h-full flex-col gap-3 p-4" spotlight>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ink">Instruction</h2>
              <Badge tone="outline" mono className="ml-auto">
                source · {source}
              </Badge>
            </div>

            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  submit(text, source);
                }
              }}
              rows={3}
              placeholder="e.g. Research upcoming AI hackathons, compare the top 3, and create a preparation plan for this week."
              aria-label="Instruction"
              className="scrollbar-thin min-h-[4.5rem] w-full resize-y rounded-lg border border-line bg-surface-2/70 px-3 py-2.5 text-sm leading-relaxed text-ink placeholder:text-subtle transition-colors focus:border-accent-500/60 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => submit(text, source)} disabled={startRun.isPending || !text.trim()}>
                {startRun.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                Run workflow
              </Button>
              <span className="hidden items-center gap-1 text-[0.68rem] text-subtle sm:flex">
                <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono">⌘</kbd>
                <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono">↵</kbd>
                to run
              </span>
              {processing && (
                <span className="ml-auto inline-flex items-center gap-1.5 text-[0.7rem] text-accent-300">
                  <Loader2 className="size-3.5 animate-spin" />
                  pipeline running
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => submit(example.text, 'text')}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2/60 px-3 py-1.5 text-xs text-muted transition-colors hover:border-brand-500/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
                >
                  <Sparkles className="size-3.5 text-brand-400 transition-transform group-hover:scale-110" />
                  {example.label}
                </button>
              ))}
            </div>
          </Card>
        </section>

        <section style={{ gridArea: 'memory' }} className="min-w-0">
          <RetrievedMemoryPanel run={run} />
        </section>

        <section style={{ gridArea: 'timeline' }} className="min-w-0">
          <ExecutionTimeline run={run} streamState={streamState} streamError={streamError} />
        </section>

        <section style={{ gridArea: 'final' }} className="min-w-0">
          <FinalResponseCard run={run} />
        </section>
      </div>
    </div>
  );
}
