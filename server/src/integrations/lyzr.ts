import { config, DEMO_MODE } from '../config/env.js';
import type { AgentKey } from '../types.js';

/**
 * Lyzr Agent API adapter.
 *
 * Verified against https://docs.lyzr.ai/enterprise/api/agents/chat (Inference v3):
 *   POST https://agent-prod.studio.lyzr.ai/v3/inference/chat/
 *   headers: x-api-key: <LYZR_API_KEY>, Content-Type: application/json
 *   body:    { user_id, agent_id, session_id, message, system_prompt_variables?, filter_variables?, features? }
 *   200 →    { "response": "<agent text>" }
 *
 * Agents are created in Lyzr Studio (see README) and referenced by ID via env.
 * Every key stays on this server — the browser never sees Lyzr credentials.
 *
 * Rate limits: Lyzr returns HTTP 429 when throttled. We retry AT MOST ONCE,
 * honoring Retry-After, capped at MAX_RETRY_WAIT_MS. We never spin on 429 —
 * after the single retry we surface a clear error so the orchestrator can mark
 * that step failed without crashing the run.
 */

const LYZR_BASE_URL = 'https://agent-prod.studio.lyzr.ai';
const MAX_RATE_LIMIT_RETRIES = 1;
const MAX_RETRY_WAIT_MS = 10_000;

const AGENT_IDS: Record<AgentKey, string | undefined> = {
  orchestrator: config.LYZR_ORCHESTRATOR_AGENT_ID,
  research: config.LYZR_RESEARCH_AGENT_ID,
  planning: config.LYZR_PLANNING_AGENT_ID,
  task: config.LYZR_TASK_AGENT_ID,
};

const ALL_AGENT_KEYS: AgentKey[] = ['orchestrator', 'research', 'planning', 'task'];

export function lyzrConfigured(): boolean {
  return (
    !DEMO_MODE &&
    Boolean(config.LYZR_API_KEY) &&
    ALL_AGENT_KEYS.every((k) => Boolean(AGENT_IDS[k]))
  );
}

export class LyzrError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'LyzrError';
  }
}

/** Parse a Retry-After header (seconds or HTTP date) into milliseconds. */
export function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const dateMs = Date.parse(header);
  if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
}

export interface RateLimitOptions {
  maxRetries?: number;
  maxWaitMs?: number;
  sleep?: (ms: number) => Promise<void>;
  onWait?: (ms: number, attempt: number) => void;
}

/**
 * Run a request function, retrying at most `maxRetries` times on HTTP 429.
 * Isolated from the network so it can be unit-tested deterministically.
 * Returns the last Response (caller decides how to handle a non-ok status).
 */
export async function withRateLimitRetry(
  attemptFn: () => Promise<Response>,
  opts: RateLimitOptions = {},
): Promise<Response> {
  const maxRetries = opts.maxRetries ?? MAX_RATE_LIMIT_RETRIES;
  const maxWaitMs = opts.maxWaitMs ?? MAX_RETRY_WAIT_MS;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  let res = await attemptFn();
  let attempt = 0;
  while (res.status === 429 && attempt < maxRetries) {
    attempt++;
    const retryAfterHeader = res.headers.get('retry-after');
    const requested = parseRetryAfterMs(retryAfterHeader) ?? 1000;
    const waitMs = Math.min(Math.max(requested, 0), maxWaitMs);
    opts.onWait?.(waitMs, attempt);
    // Drain the body so the connection can be reused.
    await res.text().catch(() => '');
    await sleep(waitMs);
    res = await attemptFn();
  }
  return res;
}

/** Run one Lyzr agent and return its raw text response. */
export async function runAgent(agentKey: AgentKey, message: string, sessionId: string): Promise<string> {
  if (DEMO_MODE) {
    throw new LyzrError('runAgent called in DEMO_MODE — demo agents simulate locally');
  }
  const agentId = AGENT_IDS[agentKey];
  if (!agentId || !config.LYZR_API_KEY) {
    throw new LyzrError(`Lyzr agent "${agentKey}" is not configured (missing agent ID or API key)`);
  }

  const attempt = async (): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
    try {
      return await fetch(`${LYZR_BASE_URL}/v3/inference/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.LYZR_API_KEY as string,
        },
        body: JSON.stringify({
          user_id: 'voiceflow-user',
          agent_id: agentId,
          session_id: sessionId,
          message,
          system_prompt_variables: {},
          filter_variables: {},
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  const res = await withRateLimitRetry(attempt, {
    onWait: (ms, attemptNo) =>
      console.warn(`[lyzr] ${agentKey} rate limited (429) — retry ${attemptNo} in ${ms}ms`),
  });

  if (res.status === 429) {
    throw new LyzrError(`Lyzr ${agentKey} rate limited (429) after retry — try again shortly`, 429);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new LyzrError(`Lyzr ${agentKey} failed: HTTP ${res.status} ${body.slice(0, 200)}`, res.status);
  }
  const data = (await res.json()) as { response?: unknown };
  if (typeof data.response !== 'string') {
    throw new LyzrError(`Lyzr ${agentKey} returned an unexpected payload`);
  }
  return data.response;
}
