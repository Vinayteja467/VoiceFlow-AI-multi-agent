import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useRunStore } from '../store/runStore';
import type {
  ApprovalsListResponse,
  ResolveApprovalInput,
  TasksListResponse,
  UpdateTaskInput,
  VoiceSource,
} from '../types';

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: api.health,
    refetchInterval: 30_000,
    retry: 1,
    staleTime: 15_000,
  });
}

export function useOmiLatest(enabled = true) {
  return useQuery({
    queryKey: ['omi-latest'],
    queryFn: api.omiLatest,
    enabled,
    refetchInterval: enabled ? 5_000 : false,
    retry: 1,
  });
}

export function useMemoryList() {
  return useQuery({
    queryKey: ['memory'],
    queryFn: api.memory,
    staleTime: 10_000,
  });
}

/** Semantic search over the vector store; disabled until the query is useful. */
export function useMemorySearch(q: string) {
  return useQuery({
    queryKey: ['memory-search', q],
    queryFn: () => api.searchMemory(q, 12),
    enabled: q.trim().length >= 2,
    staleTime: 15_000,
    retry: 1,
  });
}

export function useRuns() {
  return useQuery({
    queryKey: ['runs'],
    queryFn: api.listRuns,
    staleTime: 5_000,
  });
}

export function useRun(runId?: string) {
  return useQuery({
    queryKey: ['run', runId],
    queryFn: () => api.getRun(runId as string),
    enabled: Boolean(runId),
  });
}

export function useTasks(runId?: string) {
  return useQuery({
    queryKey: ['tasks', runId ?? 'all'],
    queryFn: () => api.listTasks(runId),
    staleTime: 5_000,
  });
}

interface UpdateTaskVars {
  id: string;
  patch: UpdateTaskInput;
}

interface TasksSnapshot {
  key: readonly unknown[];
  data: TasksListResponse | undefined;
}

/** Move a task between kanban columns with an optimistic in-place update. */
export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: UpdateTaskVars) => api.updateTask(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const snapshot: TasksSnapshot[] = qc
        .getQueriesData<TasksListResponse>({ queryKey: ['tasks'] })
        .map(([key, data]) => ({ key: key as readonly unknown[], data }));
      for (const { key, data } of snapshot) {
        if (!data) continue;
        qc.setQueryData<TasksListResponse>(key, {
          tasks: data.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        });
      }
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      for (const { key, data } of ctx?.snapshot ?? []) qc.setQueryData(key, data);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useApprovals() {
  return useQuery({
    queryKey: ['approvals'],
    queryFn: api.approvals,
    staleTime: 5_000,
  });
}

interface ResolveApprovalVars {
  id: string;
  input: ResolveApprovalInput;
}

/** Approve / reject a queued external action (the human gate). */
export function useResolveApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: ResolveApprovalVars) => api.resolveApproval(id, input),
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: ['approvals'] });
      const prev = qc.getQueryData<ApprovalsListResponse>(['approvals']);
      if (prev) {
        const status = input.action === 'approve' ? 'approved' : 'rejected';
        qc.setQueryData<ApprovalsListResponse>(['approvals'], {
          pending: Math.max(0, prev.pending - 1),
          approvals: prev.approvals.map((a) =>
            a.id === id ? { ...a, status, resolvedAt: new Date().toISOString() } : a,
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['approvals'], ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}

/** Start a run and register it as the active run for the SSE stream. */
export function useStartRun() {
  const beginRun = useRunStore((s) => s.beginRun);
  return useMutation({
    mutationFn: ({ text, source }: { text: string; source: VoiceSource }) => api.createRun(text, source),
    onSuccess: (res, vars) => {
      beginRun({ runId: res.runId, text: vars.text, source: vars.source });
    },
  });
}
