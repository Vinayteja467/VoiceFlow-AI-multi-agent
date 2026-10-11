import { create } from 'zustand';
import type {
  FinalResponse,
  Finding,
  PlanOutput,
  RetrievedMemory,
  Run,
  RunEvent,
  StepEvent,
  TaskAgentOutput,
  VoiceSource,
} from '../types';

export type StreamState = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

interface RunState {
  activeRunId: string | null;
  runs: Record<string, Run>;
  streamState: StreamState;
  streamError?: string;

  /** Register a freshly-started run (POST /api/runs returns only the id). */
  beginRun: (input: { runId: string; text: string; source: VoiceSource }) => void;
  /** Reduce one SSE event into the run's timeline + derived fields. */
  ingest: (event: RunEvent) => void;
  setStreamState: (state: StreamState, error?: string) => void;
  setActiveRun: (runId: string | null) => void;
  reset: () => void;
}

function placeholderRun(runId: string, text: string, source: VoiceSource): Run {
  const now = new Date().toISOString();
  return {
    id: runId,
    title: text.trim().slice(0, 60) || 'Voice workflow',
    transcript: text,
    source,
    status: 'running',
    createdAt: now,
    updatedAt: now,
    steps: [],
    memories: [],
  };
}

/** Replace a step in place (running → done) or append a new one. */
function upsertStep(steps: StepEvent[], event: RunEvent): StepEvent[] {
  const idx = steps.findIndex((s) => s.step === event.step && s.agent === event.agent);
  if (idx >= 0) {
    const next = steps.slice();
    next[idx] = event;
    return next;
  }
  return [...steps, event];
}

export const useRunStore = create<RunState>((set) => ({
  activeRunId: null,
  runs: {},
  streamState: 'idle',

  beginRun: ({ runId, text, source }) =>
    set((state) => ({
      activeRunId: runId,
      streamState: 'connecting',
      streamError: undefined,
      runs: { ...state.runs, [runId]: placeholderRun(runId, text, source) },
    })),

  ingest: (event) =>
    set((state) => {
      const existing = state.runs[event.runId] ?? placeholderRun(event.runId, '', 'text');
      const steps = upsertStep(existing.steps, event);
      const patch: Partial<Run> = { steps, updatedAt: event.timestamp };

      const p = (event.payload ?? undefined) as Record<string, unknown> | undefined;
      switch (event.step) {
        case 'intake':
          if (p && typeof p['title'] === 'string') patch.title = p['title'];
          break;
        case 'memory_retrieve':
          if (p && Array.isArray(p['memories'])) patch.memories = p['memories'] as RetrievedMemory[];
          break;
        case 'research':
          if (p && Array.isArray(p['findings'])) patch.findings = p['findings'] as Finding[];
          break;
        case 'planning':
          if (p && p['plan']) patch.plan = p['plan'] as PlanOutput;
          break;
        case 'task':
          if (p && p['taskOutput']) patch.taskOutput = p['taskOutput'] as TaskAgentOutput;
          break;
        case 'synthesis':
          if (p && p['finalResponse']) patch.finalResponse = p['finalResponse'] as FinalResponse;
          break;
        case 'complete':
          patch.status = event.status === 'error' ? 'error' : 'done';
          patch.durationMs = event.durationMs;
          break;
        default:
          break;
      }

      if (event.status === 'error') patch.error = event.message;

      return {
        runs: { ...state.runs, [event.runId]: { ...existing, ...patch } },
      };
    }),

  setStreamState: (state, error) => set({ streamState: state, streamError: error }),
  setActiveRun: (runId) => set({ activeRunId: runId }),
  reset: () => set({ activeRunId: null, streamState: 'idle', streamError: undefined }),
}));

export function useActiveRun(): Run | undefined {
  return useRunStore((s) => (s.activeRunId ? s.runs[s.activeRunId] : undefined));
}
