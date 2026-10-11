import {
  CalendarRange,
  CircleCheckBig,
  DatabaseBackup,
  DatabaseZap,
  GitMerge,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Telescope,
  type LucideIcon,
} from 'lucide-react';
import type { RunEvent, StepAgent, StepId } from '../types';

export type Tone =
  | 'research'
  | 'planning'
  | 'task'
  | 'orchestrator'
  | 'memory'
  | 'synthesis'
  | 'approval'
  | 'neutral';

export interface StepMeta {
  id: StepId;
  label: string;
  short: string;
  agent: StepAgent;
  tone: Tone;
  blurb: string;
  icon: LucideIcon;
}

/** The pipeline, in execution order — mirrors orchestrator.ts exactly. */
export const STEP_META: StepMeta[] = [
  {
    id: 'intake',
    label: 'Intake',
    short: 'Intake',
    agent: 'orchestrator',
    tone: 'orchestrator',
    blurb: 'Normalize the transcript and classify intent',
    icon: Sparkles,
  },
  {
    id: 'memory_retrieve',
    label: 'Memory Retrieve',
    short: 'Memory',
    agent: 'memory',
    tone: 'memory',
    blurb: 'Embed the request and query vector memory',
    icon: DatabaseZap,
  },
  {
    id: 'research',
    label: 'Research',
    short: 'Research',
    agent: 'research',
    tone: 'research',
    blurb: 'Gather sourced findings on the request',
    icon: Telescope,
  },
  {
    id: 'planning',
    label: 'Planning',
    short: 'Planning',
    agent: 'planning',
    tone: 'planning',
    blurb: 'Compare options and build a week plan',
    icon: CalendarRange,
  },
  {
    id: 'task',
    label: 'Task',
    short: 'Tasks',
    agent: 'task',
    tone: 'task',
    blurb: 'Convert the plan into executable tasks',
    icon: ListChecks,
  },
  {
    id: 'synthesis',
    label: 'Synthesis',
    short: 'Synthesis',
    agent: 'synthesis',
    tone: 'synthesis',
    blurb: 'Merge every agent output into one response',
    icon: GitMerge,
  },
  {
    id: 'memory_save',
    label: 'Memory Save',
    short: 'Save',
    agent: 'memory',
    tone: 'memory',
    blurb: 'Embed and upsert results to vector memory',
    icon: DatabaseBackup,
  },
  {
    id: 'approval_gate',
    label: 'Approval Gate',
    short: 'Approval',
    agent: 'approval',
    tone: 'approval',
    blurb: 'Hold external actions for human approval',
    icon: ShieldCheck,
  },
  {
    id: 'complete',
    label: 'Complete',
    short: 'Complete',
    agent: 'orchestrator',
    tone: 'orchestrator',
    blurb: 'Workflow finished',
    icon: CircleCheckBig,
  },
];

export const STEP_BY_ID: Record<string, StepMeta> = Object.fromEntries(
  STEP_META.map((s) => [s.id, s]),
);

export const STEP_ORDER: StepId[] = STEP_META.map((s) => s.id);

export interface ToneStyle {
  text: string;
  bg: string;
  border: string;
  ring: string;
  dot: string;
  raw: string;
  chip: string;
}

/** Full literal class names so Tailwind's scanner can see every one. */
export const TONES: Record<Tone, ToneStyle> = {
  research: {
    text: 'text-research',
    bg: 'bg-research/10',
    border: 'border-research/30',
    ring: 'ring-research/40',
    dot: 'bg-research',
    raw: 'oklch(0.78 0.13 205)',
    chip: 'bg-research/12 text-research border-research/25',
  },
  planning: {
    text: 'text-planning',
    bg: 'bg-planning/10',
    border: 'border-planning/30',
    ring: 'ring-planning/40',
    dot: 'bg-planning',
    raw: 'oklch(0.68 0.19 293)',
    chip: 'bg-planning/12 text-planning border-planning/25',
  },
  task: {
    text: 'text-task',
    bg: 'bg-task/10',
    border: 'border-task/30',
    ring: 'ring-task/40',
    dot: 'bg-task',
    raw: 'oklch(0.76 0.16 152)',
    chip: 'bg-task/12 text-task border-task/25',
  },
  orchestrator: {
    text: 'text-orchestrator',
    bg: 'bg-orchestrator/10',
    border: 'border-orchestrator/30',
    ring: 'ring-orchestrator/40',
    dot: 'bg-orchestrator',
    raw: 'oklch(0.83 0.15 82)',
    chip: 'bg-orchestrator/12 text-orchestrator border-orchestrator/25',
  },
  memory: {
    text: 'text-memory',
    bg: 'bg-memory/10',
    border: 'border-memory/30',
    ring: 'ring-memory/40',
    dot: 'bg-memory',
    raw: 'oklch(0.74 0.16 340)',
    chip: 'bg-memory/12 text-memory border-memory/25',
  },
  synthesis: {
    text: 'text-synthesis',
    bg: 'bg-synthesis/10',
    border: 'border-synthesis/30',
    ring: 'ring-synthesis/40',
    dot: 'bg-synthesis',
    raw: 'oklch(0.71 0.17 275)',
    chip: 'bg-synthesis/12 text-synthesis border-synthesis/25',
  },
  approval: {
    text: 'text-approval',
    bg: 'bg-approval/10',
    border: 'border-approval/30',
    ring: 'ring-approval/40',
    dot: 'bg-approval',
    raw: 'oklch(0.83 0.15 82)',
    chip: 'bg-approval/12 text-approval border-approval/25',
  },
  neutral: {
    text: 'text-muted',
    bg: 'bg-surface-2',
    border: 'border-line',
    ring: 'ring-line',
    dot: 'bg-subtle',
    raw: 'oklch(0.64 0.016 285)',
    chip: 'bg-surface-2 text-muted border-line',
  },
};

export function toneForStep(step?: string): Tone {
  return STEP_BY_ID[step ?? '']?.tone ?? 'neutral';
}

export function toneForAgent(agent?: StepAgent): Tone {
  switch (agent) {
    case 'research':
      return 'research';
    case 'planning':
      return 'planning';
    case 'task':
      return 'task';
    case 'orchestrator':
      return 'orchestrator';
    case 'memory':
      return 'memory';
    case 'synthesis':
      return 'synthesis';
    case 'approval':
      return 'approval';
    default:
      return 'neutral';
  }
}

/**
 * Label the handoff edge, describing what the previous step passed forward.
 * Reads the *previous* event's payload — never invents data.
 */
export function handoffLabel(toStep: string, prev?: RunEvent): string {
  const p = (prev?.payload ?? undefined) as Record<string, unknown> | undefined;
  const num = (v: unknown) => (Array.isArray(v) ? v.length : 0);

  switch (prev?.step) {
    case 'intake':
      return p && typeof p.intent === 'string' ? `intent · ${String(p.intent)}` : 'classified intent';
    case 'memory_retrieve': {
      const n = num(p?.['memories']);
      return n > 0 ? `${n} ${n === 1 ? 'memory' : 'memories'} → context` : 'no memories above threshold';
    }
    case 'research': {
      const n = num(p?.['findings']);
      return `${n} ${n === 1 ? 'finding' : 'findings'} → Planning`;
    }
    case 'planning': {
      const plan = p?.['plan'] as { comparison?: unknown[]; weekPlan?: unknown[] } | undefined;
      return `${plan?.comparison?.length ?? 0} options · ${plan?.weekPlan?.length ?? 0} blocks → Task`;
    }
    case 'task': {
      const to = p?.['taskOutput'] as { tasks?: unknown[]; externalActions?: unknown[] } | undefined;
      return `${to?.tasks?.length ?? 0} tasks · ${to?.externalActions?.length ?? 0} approvals → Synthesis`;
    }
    case 'synthesis':
      return 'final response → memory';
    case 'memory_save': {
      const n = num(p?.['saved']);
      return `${n} ${n === 1 ? 'memory' : 'memories'} saved`;
    }
    case 'approval_gate': {
      const n = num(p?.['pendingApprovals']);
      return n > 0 ? `${n} held — nothing auto-executed` : 'no external actions';
    }
    default:
      return toStep;
  }
}
