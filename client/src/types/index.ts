// ---------------------------------------------------------------------------
// Client-side mirror of the server domain types.
// Source of truth: server/src/types.ts — field names are copied verbatim.
// ---------------------------------------------------------------------------

export type AgentKey = 'orchestrator' | 'research' | 'planning' | 'task';

/** Every non-agent producer / consumer in the pipeline. */
export type StepAgent = AgentKey | 'memory' | 'synthesis' | 'approval';

export type StepStatus = 'queued' | 'running' | 'done' | 'error';
export type RunStatus = 'running' | 'done' | 'error';
export type VoiceSource = 'omi' | 'browser' | 'text';
export type MemoryType = 'finding' | 'plan' | 'decision' | 'fact';
export type TaskStatus = 'pending' | 'in_progress' | 'done';
export type Priority = 'P0' | 'P1' | 'P2';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ApprovalActionType = 'email' | 'calendar' | 'message';

/** Pipeline step ids, in execution order. */
export type StepId =
  | 'intake'
  | 'memory_retrieve'
  | 'research'
  | 'planning'
  | 'task'
  | 'synthesis'
  | 'memory_save'
  | 'approval_gate'
  | 'complete';

/** SSE event emitted at every pipeline transition (`event: step`). */
export interface RunEvent {
  runId: string;
  step: string;
  agent: StepAgent;
  status: StepStatus;
  message: string;
  payload?: unknown;
  timestamp: string;
  durationMs?: number;
}

/** Backwards-compatible alias matching the server's name. */
export type StepEvent = RunEvent;

export interface Finding {
  title: string;
  summary: string;
  source: string;
  date: string;
  relevanceScore: number;
  tags: string[];
}

export interface PlanBlock {
  day: string;
  block: string;
  priority: Priority;
  rationale: string;
}

export interface ComparisonRow {
  option: string;
  pros: string[];
  cons: string[];
  verdict: string;
}

export interface PlanOutput {
  comparison: ComparisonRow[];
  weekPlan: PlanBlock[];
  rationale: string;
}

export interface TaskItem {
  id: string;
  title: string;
  due: string;
  priority: Priority;
  status: TaskStatus;
  owner: string;
  dependsOn: string[];
}

export interface ExternalAction {
  id: string;
  actionType: ApprovalActionType;
  title: string;
  description: string;
  payload: Record<string, unknown>;
}

export interface TaskAgentOutput {
  tasks: TaskItem[];
  completionSummary: string;
  externalActions: ExternalAction[];
}

export interface FinalResponse {
  headline: string;
  keyFindings: string[];
  plan: string;
  nextActions: string[];
  suggestedFollowUps: string[];
}

export interface RetrievedMemory {
  id: string;
  text: string;
  type: MemoryType;
  tags: string[];
  score: number;
  createdAt: string;
  runId?: string;
}

export interface MemoryPoint {
  id: string;
  text: string;
  type: MemoryType;
  tags: string[];
  runId?: string;
  createdAt: string;
}

export interface Run {
  id: string;
  title: string;
  transcript: string;
  source: VoiceSource;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  durationMs?: number;
  steps: RunEvent[];
  memories: RetrievedMemory[];
  findings?: Finding[];
  plan?: PlanOutput;
  taskOutput?: TaskAgentOutput;
  finalResponse?: FinalResponse;
  error?: string;
}

export interface Task {
  id: string;
  runId: string;
  title: string;
  due: string;
  priority: Priority;
  status: TaskStatus;
  owner: string;
  dependsOn: string[];
  createdAt: string;
}

export interface AuditEntry {
  at: string;
  action: string;
  detail?: string;
}

export interface Approval {
  id: string;
  runId: string;
  actionType: ApprovalActionType;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  status: ApprovalStatus;
  createdAt: string;
  resolvedAt?: string;
  audit: AuditEntry[];
}

export interface OmiTranscript {
  id: string;
  text: string;
  source: 'omi';
  sessionId?: string;
  uid?: string;
  receivedAt: string;
}

// ---------------------------------------------------------------------------
// Per-step payload shapes (the `payload` field of RunEvent is `unknown` on the
// wire; these narrow it per step so the UI never invents field names).
// ---------------------------------------------------------------------------

export interface IntakePayload {
  intent: string;
  title: string;
  normalizedText: string;
}

export interface MemoryRetrievePayload {
  memories: RetrievedMemory[];
  threshold: number;
  topK: number;
}

export interface ResearchPayload {
  findings: Finding[];
}

export interface PlanningPayload {
  plan: PlanOutput;
}

export interface TaskPayload {
  taskOutput: TaskAgentOutput;
}

export interface SynthesisPayload {
  finalResponse: FinalResponse;
}

export interface MemorySavePayload {
  saved: { type: MemoryType; text: string }[];
}

export interface ApprovalGatePayload {
  pendingApprovals: string[];
}

/** A single agent's I/O, reconstructed from the timeline for the JSON panels. */
export interface AgentOutput {
  step: StepId | string;
  agent: StepAgent;
  status: StepStatus;
  message: string;
  /** What the agent received (previous step's product / the request). */
  input: unknown;
  /** What the agent produced (this step's payload). */
  output: unknown;
  durationMs?: number;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// API envelopes (exact shapes returned by the server)
// ---------------------------------------------------------------------------

export interface HealthResponse {
  ok: boolean;
  mode: 'demo' | 'live';
  embeddingProvider: string;
  collection: string;
  time: string;
}

export interface CreateRunResponse {
  runId: string;
}

export interface RunsListResponse {
  runs: Run[];
}

export interface RunResponse {
  run: Run;
}

export interface MemoryListResponse {
  results: MemoryPoint[];
  count: number;
  provider: string;
}

export interface MemorySearchResponse {
  results: RetrievedMemory[];
  provider: string;
  collection: string;
}

export interface OmiLatestResponse {
  transcript: OmiTranscript | null;
  count: number;
}

export interface TasksListResponse {
  tasks: Task[];
}

export interface TaskResponse {
  task: Task;
}

export interface UpdateTaskInput {
  status?: TaskStatus;
  priority?: Priority;
  title?: string;
}

export interface ApprovalsListResponse {
  approvals: Approval[];
  pending: number;
}

export interface ApprovalResponse {
  approval: Approval;
}

export interface ResolveApprovalInput {
  action: 'approve' | 'reject';
  /** Optional field overrides merged into the action payload on approval. */
  edits?: Record<string, unknown>;
}
