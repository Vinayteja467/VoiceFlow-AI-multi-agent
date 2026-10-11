import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { config, DEMO_MODE } from '../config/env.js';
import { embed } from '../integrations/embeddings.js';
import { getMemoryStore } from '../integrations/memory.js';
import * as db from '../store/db.js';
import type {
  AgentKey,
  FinalResponse,
  Finding,
  PlanOutput,
  Priority,
  RetrievedMemory,
  Run,
  StepEvent,
  StepStatus,
  Task,
  TaskAgentOutput,
  VoiceSource,
} from '../types.js';
import { runResearchAgent } from './research.js';
import { runPlanningAgent } from './planning.js';
import { runTaskAgent } from './task.js';
import { memoryPointsFor } from './demo.js';

/**
 * Orchestrator — runs the full multi-agent pipeline and emits an SSE event at
 * every transition. One failed agent never crashes the run: the step is marked
 * "error" and the pipeline continues with whatever output exists.
 *
 * Pipeline: INTAKE → MEMORY RETRIEVE → RESEARCH → PLANNING → TASK → SYNTHESIS
 *           → MEMORY SAVE → APPROVAL GATE
 */

export interface StartRunInput {
  text: string;
  source: VoiceSource;
}

const MEMORY_THRESHOLD = 0.25;
const MEMORY_TOP_K = 5;
/** Demo mode only: hold each agent on "running" so the UI timeline animates. */
const DEMO_STEP_MS = 520;

// ---------------------------------------------------------------------------
// Intake helpers
// ---------------------------------------------------------------------------

function generateTitle(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  const words = cleaned.split(' ').slice(0, 7).join(' ');
  const topic = /hackathon/i.test(cleaned)
    ? 'AI Hackathon Prep'
    : /research|compare|plan/i.test(cleaned)
      ? 'Research & Planning'
      : 'Voice Workflow';
  return cleaned.length <= 60 ? cleaned : `${words}…`.replace(/…$/, ` — ${topic}`);
}

function classifyIntent(text: string): string {
  const lower = text.toLowerCase();
  if (/hackathon|competition|contest/.test(lower)) return 'hackathon_preparation';
  if (/email|send|message/.test(lower)) return 'communication';
  if (/calendar|schedule|meeting|event/.test(lower)) return 'scheduling';
  if (/research|compare|analyze|find/.test(lower)) return 'research_and_comparison';
  if (/plan|organize|prepare|week/.test(lower)) return 'planning';
  return 'general_workflow';
}

function uid(): string {
  return randomUUID();
}

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

class Orchestrator extends EventEmitter {
  private runs = new Map<string, Run>();

  /** Start a pipeline run asynchronously; returns the run id immediately. */
  async startRun(input: StartRunInput): Promise<string> {
    const runId = uid();
    const now = new Date().toISOString();

    const run: Run = {
      id: runId,
      title: generateTitle(input.text),
      transcript: input.text,
      source: input.source,
      status: 'running',
      createdAt: now,
      updatedAt: now,
      steps: [],
      memories: [],
    };
    this.runs.set(runId, run);
    db.saveRun(run);

    // Fire and forget — the SSE stream consumes events.
    void this.execute(runId, input.text).catch(async (err) => {
      console.error(`[orchestrator] run ${runId} crashed:`, err);
      await this.emitStep(runId, 'orchestrator', 'orchestrator', 'error', `Run crashed: ${(err as Error).message}`, undefined);
      const r = this.runs.get(runId);
      if (r) {
        r.status = 'error';
        r.error = (err as Error).message;
        r.updatedAt = new Date().toISOString();
        db.saveRun(r);
      }
      this.emit('done', { runId });
    });

    return runId;
  }

  getRun(runId: string): Run | undefined {
    return this.runs.get(runId) ?? db.getRun(runId);
  }

  subscribe(runId: string, cb: (e: StepEvent) => void): () => void {
    const handler = (e: StepEvent) => {
      if (e.runId === runId) cb(e);
    };
    this.on('step', handler);
    return () => this.off('step', handler);
  }

  private async emitStep(
    runId: string,
    step: string,
    agent: StepEvent['agent'],
    status: StepStatus,
    message: string,
    payload?: unknown,
    durationMs?: number,
  ): Promise<StepEvent> {
    const event: StepEvent = {
      runId,
      step,
      agent,
      status,
      message,
      payload,
      timestamp: new Date().toISOString(),
      durationMs,
    };
    const run = this.runs.get(runId);
    if (run) {
      const existing = run.steps.findIndex((s) => s.step === step && s.agent === agent);
      if (existing >= 0) run.steps[existing] = event;
      else run.steps.push(event);
      run.updatedAt = event.timestamp;
      db.saveRun(run);
    }
    this.emit('step', event);
    // Demo mode: hold each agent on "running" briefly so the UI timeline animates.
    if (status === 'running' && DEMO_MODE) await delay(DEMO_STEP_MS);
    return event;
  }

  private patchRun(runId: string, patch: Partial<Run>): void {
    const run = this.runs.get(runId);
    if (!run) return;
    Object.assign(run, patch, { updatedAt: new Date().toISOString() });
    db.saveRun(run);
  }

  private async execute(runId: string, text: string): Promise<void> {
    const startedAt = Date.now();
    const sessionId = `${runId}-session`;

    // ---- Step 0: INTAKE -------------------------------------------------
    await this.emitStep(runId, 'intake', 'orchestrator', 'running', 'Normalizing transcript and classifying intent…');
    const intent = classifyIntent(text);
    const title = generateTitle(text);
    this.patchRun(runId, { title });
    await this.emitStep(
      runId,
      'intake',
      'orchestrator',
      'done',
      `Intent classified as "${intent}" — run titled "${title}"`,
      { intent, title, normalizedText: text },
      Date.now() - startedAt,
    );

    // ---- Step 1: MEMORY RETRIEVE ----------------------------------------
    await this.emitStep(runId, 'memory_retrieve', 'memory', 'running', 'Embedding request and querying vector memory…');
    const memStart = Date.now();
    let memories: RetrievedMemory[] = [];
    try {
      const vector = await embed(text);
      const store = getMemoryStore();
      const results = await store.search(vector, MEMORY_TOP_K, MEMORY_THRESHOLD);
      memories = results.map((r) => ({ ...r }));
      this.patchRun(runId, { memories });
      await this.emitStep(
        runId,
        'memory_retrieve',
        'memory',
        'done',
        memories.length > 0
          ? `Retrieved ${memories.length} relevant memor${memories.length === 1 ? 'y' : 'ies'} from vector store`
          : 'No relevant memories above threshold — starting fresh',
        { memories, threshold: MEMORY_THRESHOLD, topK: MEMORY_TOP_K },
        Date.now() - memStart,
      );
    } catch (err) {
      await this.emitStep(runId, 'memory_retrieve', 'memory', 'error', `Memory retrieve failed: ${(err as Error).message}`);
    }

    // ---- Step 2: RESEARCH ------------------------------------------------
    await this.emitStep(runId, 'research', 'research', 'running', 'Research agent is investigating the request…');
    const researchStart = Date.now();
    let findings: Finding[] = [];
    try {
      const out = await runResearchAgent({ request: text, memories }, sessionId);
      findings = out.findings;
      this.patchRun(runId, { findings });
      await this.emitStep(
        runId,
        'research',
        'research',
        'done',
        `Research returned ${findings.length} sourced findings`,
        { findings },
        Date.now() - researchStart,
      );
    } catch (err) {
      await this.emitStep(runId, 'research', 'research', 'error', `Research agent failed: ${(err as Error).message}`);
    }

    // ---- Step 3: PLANNING ------------------------------------------------
    await this.emitStep(runId, 'planning', 'planning', 'running', 'Planning agent is building comparison + week plan…');
    const planStart = Date.now();
    let plan: PlanOutput | undefined;
    try {
      const out = await runPlanningAgent({ request: text, research: { findings }, memories }, sessionId);
      plan = out;
      this.patchRun(runId, { plan: out });
      await this.emitStep(
        runId,
        'planning',
        'planning',
        'done',
        `Plan ready: ${out.comparison.length} options compared, ${out.weekPlan.length} week blocks scheduled`,
        { plan: out },
        Date.now() - planStart,
      );
    } catch (err) {
      await this.emitStep(runId, 'planning', 'planning', 'error', `Planning agent failed: ${(err as Error).message}`);
    }

    // ---- Step 4: TASK ----------------------------------------------------
    await this.emitStep(runId, 'task', 'task', 'running', 'Task agent is converting the plan into executable tasks…');
    const taskStart = Date.now();
    let taskOutput: TaskAgentOutput | undefined;
    if (plan) {
      try {
        const out = await runTaskAgent({ plan, request: text }, sessionId);
        taskOutput = out;
        this.patchRun(runId, { taskOutput: out });

        // Persist tasks for the board
        for (const t of out.tasks) {
          db.saveTask({
            ...t,
            runId,
            status: 'pending',
            createdAt: new Date().toISOString(),
          });
        }

        await this.emitStep(
          runId,
          'task',
          'task',
          'done',
          `Task agent produced ${out.tasks.length} tasks and ${out.externalActions.length} action(s) needing approval`,
          { taskOutput: out },
          Date.now() - taskStart,
        );
      } catch (err) {
        await this.emitStep(runId, 'task', 'task', 'error', `Task agent failed: ${(err as Error).message}`);
      }
    } else {
      await this.emitStep(runId, 'task', 'task', 'error', 'Skipped — planning produced no output to task-ify');
    }

    // ---- Step 5: SYNTHESIS -----------------------------------------------
    await this.emitStep(runId, 'synthesis', 'synthesis', 'running', 'Merging all agent outputs into the final response…');
    const synthStart = Date.now();
    const finalResponse = synthesize(findings, plan, taskOutput, memories);
    this.patchRun(runId, { finalResponse });
    await this.emitStep(
      runId,
      'synthesis',
      'synthesis',
      'done',
      'Final response assembled from Research + Planning + Task outputs',
      { finalResponse },
      Date.now() - synthStart,
    );

    // ---- Step 6: MEMORY SAVE ---------------------------------------------
    await this.emitStep(runId, 'memory_save', 'memory', 'running', 'Embedding and upserting results to vector memory…');
    const saveStart = Date.now();
    try {
      const store = getMemoryStore();
      const points = memoryPointsFor(runId, findings, plan ?? { comparison: [], weekPlan: [], rationale: '' });
      for (const p of points) {
        const id = uid();
        const createdAt = new Date().toISOString();
        const vector = await embed(p.text);
        const point = { id, text: p.text, type: p.type, tags: p.tags, runId, createdAt, vector };
        await store.upsert(point);
        // Persist demo-mode memory so it survives restarts and feeds future runs.
        if (DEMO_MODE) db.saveMemoryPoint(point);
      }
      await this.emitStep(
        runId,
        'memory_save',
        'memory',
        'done',
        `Saved ${points.length} memory points so future runs can build on this one`,
        { saved: points.map((p) => ({ type: p.type, text: p.text.slice(0, 80) })) },
        Date.now() - saveStart,
      );
    } catch (err) {
      await this.emitStep(runId, 'memory_save', 'memory', 'error', `Memory save failed: ${(err as Error).message}`);
    }

    // ---- Step 7: APPROVAL GATE -------------------------------------------
    if (taskOutput && taskOutput.externalActions.length > 0) {
      await this.emitStep(
        runId,
        'approval_gate',
        'approval',
        'running',
        `${taskOutput.externalActions.length} external action(s) queued for human approval`,
      );
      for (const action of taskOutput.externalActions) {
        db.saveApproval({
          id: action.id,
          runId,
          actionType: action.actionType,
          title: action.title,
          description: action.description,
          payload: action.payload,
          status: 'pending',
          createdAt: new Date().toISOString(),
          audit: [{ at: new Date().toISOString(), action: 'created', detail: 'Queued by Task agent — awaiting human approval' }],
        });
      }
      await this.emitStep(
        runId,
        'approval_gate',
        'approval',
        'done',
        `${taskOutput.externalActions.length} action(s) held for approval — nothing was executed automatically`,
        { pendingApprovals: taskOutput.externalActions.map((a) => a.id) },
      );
    }

    // ---- Done -------------------------------------------------------------
    const totalMs = Date.now() - startedAt;
    this.patchRun(runId, { status: 'done', durationMs: totalMs });
    await this.emitStep(
      runId,
      'complete',
      'orchestrator',
      'done',
      `Workflow complete in ${(totalMs / 1000).toFixed(1)}s`,
      undefined,
      totalMs,
    );
    this.emit('done', { runId });
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Merge all agent outputs into one final response. */
function synthesize(
  findings: Finding[],
  plan: PlanOutput | undefined,
  taskOutput: TaskAgentOutput | undefined,
  memories: RetrievedMemory[],
): FinalResponse {
  const headline =
    findings.length > 0
      ? `Research complete: ${findings[0]!.title}`
      : 'Workflow complete';

  const keyFindings = findings.slice(0, 4).map((f) => f.summary);

  const planLines: string[] = [];
  if (plan) {
    for (const row of plan.comparison) {
      planLines.push(`${row.option}: ${row.verdict}`);
    }
    for (const b of plan.weekPlan.filter((b) => b.priority === 'P0')) {
      planLines.push(`${b.day} ${b.block}`);
    }
  }

  const nextActions = (taskOutput?.tasks ?? [])
    .filter((t) => t.priority === 'P0')
    .slice(0, 4)
    .map((t) => t.title);

  const memoryNote =
    memories.length > 0
      ? `This run was influenced by ${memories.length} retrieved ${memories.length === 1 ? 'memory' : 'memories'} (top score ${memories[0]!.score.toFixed(2)}).`
      : 'No prior memories influenced this run.';

  return {
    headline,
    keyFindings: [...keyFindings, memoryNote],
    plan: planLines.join('\n'),
    nextActions: nextActions.length > 0 ? nextActions : ['Review the task board and approve queued actions'],
    suggestedFollowUps: [
      'Ask me to refine any task or add dependencies',
      'Say "email the plan" — it will queue an approval instead of sending',
      'Run a follow-up request to see memory retrieval in action',
    ],
  };
}

export const orchestrator = new Orchestrator();
