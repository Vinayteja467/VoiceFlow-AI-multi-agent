import type {
  ApprovalResponse,
  ApprovalsListResponse,
  CreateRunResponse,
  HealthResponse,
  MemoryListResponse,
  MemorySearchResponse,
  OmiLatestResponse,
  ResolveApprovalInput,
  RunResponse,
  RunsListResponse,
  TaskResponse,
  TasksListResponse,
  UpdateTaskInput,
  VoiceSource,
} from '../types';

/** Typed error raised for any non-2xx API response. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch (err) {
    throw new ApiError(`Network error: ${(err as Error).message}`, 0);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { error?: unknown };
      if (typeof body.error === 'string') detail = body.error;
      else if (body.error) detail = JSON.stringify(body.error);
    } catch {
      /* keep statusText */
    }
    throw new ApiError(detail || `Request failed (${res.status})`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Browser-side API surface — talks only to our own Express server (no keys). */
export const api = {
  health: () => request<HealthResponse>('/api/health'),

  createRun: (text: string, source: VoiceSource = 'text') =>
    request<CreateRunResponse>('/api/runs', {
      method: 'POST',
      body: JSON.stringify({ text, source }),
    }),

  getRun: (runId: string) => request<RunResponse>(`/api/runs/${runId}`),
  listRuns: () => request<RunsListResponse>('/api/runs'),

  listTasks: (runId?: string) =>
    request<TasksListResponse>(
      runId ? `/api/tasks?runId=${encodeURIComponent(runId)}` : '/api/tasks',
    ),
  updateTask: (id: string, patch: UpdateTaskInput) =>
    request<TaskResponse>(`/api/tasks/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  approvals: () => request<ApprovalsListResponse>('/api/approvals'),
  resolveApproval: (id: string, input: ResolveApprovalInput) =>
    request<ApprovalResponse>(`/api/approvals/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  memory: () => request<MemoryListResponse>('/api/memory'),
  searchMemory: (q: string, limit = 8) =>
    request<MemorySearchResponse>(`/api/memory/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  omiLatest: () => request<OmiLatestResponse>('/api/voice/omi/latest'),
};
