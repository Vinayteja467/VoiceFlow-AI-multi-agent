// ---------------------------------------------------------------------------
// Shared domain types for VoiceFlow AI
// ---------------------------------------------------------------------------

export type AgentKey = 'orchestrator' | 'research' | 'planning' | 'task';
export type StepStatus = 'queued' | 'running' | 'done' | 'error';
export type RunStatus = 'running' | 'done' | 'error';
export type VoiceSource = 'omi' | 'browser' | 'text';
export type MemoryType = 'finding' | 'plan' | 'decision' | 'fact';
export type TaskStatus = 'pending' | 'in_progress' | 'done';
export type Priority = 'P0' | 'P1' | 'P2';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ApprovalActionType = 'email' | 'calendar' | 'message';

/** SSE event emitted at every pipeline transition. */
export interface StepEvent {
  runId: string;
  step: string;
  agent: AgentKey | 'memory' | 'synthesis' | 'approval';
  status: StepStatus;
  message: string;
  payload?: unknown;
  timestamp: string;
  durationMs?: number;
}

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
  steps: StepEvent[];
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
