import { z } from 'zod';
import { DEMO_MODE } from '../config/env.js';
import { runAgent } from '../integrations/lyzr.js';
import type { PlanOutput, TaskAgentOutput } from '../types.js';
import { TASK_SYSTEM_PROMPT } from './prompts/task.js';
import { simulateTaskAgent } from './demo.js';
import { extractJson } from './json.js';

export const taskOutputSchema = z.object({
  tasks: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        due: z.string(),
        priority: z.enum(['P0', 'P1', 'P2']),
        status: z.enum(['pending', 'in_progress', 'done']),
        owner: z.string(),
        dependsOn: z.array(z.string()),
      }),
    )
    .min(1),
  completionSummary: z.string(),
  externalActions: z
    .array(
      z.object({
        id: z.string(),
        actionType: z.enum(['email', 'calendar', 'message']),
        title: z.string(),
        description: z.string(),
        payload: z.record(z.string(), z.unknown()),
      }),
    )
    .default([]),
});

export type TaskAgentOutputSchema = z.infer<typeof taskOutputSchema>;

export interface TaskAgentInput {
  plan: PlanOutput;
  request: string;
}

function buildMessage(input: TaskAgentInput): string {
  return (
    `USER REQUEST:\n${input.request}\n\n` +
    `PLANNING OUTPUT (from the Planning agent — convert this into tasks):\n${JSON.stringify(input.plan, null, 2)}`
  );
}

/**
 * Run the Task agent. Live mode calls Lyzr; demo mode simulates. One retry on
 * invalid JSON. External actions are returned for the approval gate — this
 * agent NEVER executes them.
 */
export async function runTaskAgent(
  input: TaskAgentInput,
  sessionId: string,
): Promise<TaskAgentOutput> {
  if (DEMO_MODE) {
    return simulateTaskAgent(input.plan);
  }

  let message = `${TASK_SYSTEM_PROMPT}\n\n${buildMessage(input)}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await runAgent('task', message, sessionId);
      const parsed = taskOutputSchema.parse(extractJson(raw));
      return {
        tasks: parsed.tasks.map((t) => ({ ...t, status: 'pending' as const })),
        completionSummary: parsed.completionSummary,
        externalActions: parsed.externalActions,
      };
    } catch (err) {
      lastError = err as Error;
      if (attempt === 0) {
        message +=
          '\n\nYour previous output was not valid JSON matching the required schema. ' +
          'Respond with ONLY the corrected JSON object, no markdown, no commentary.';
      }
    }
  }
  throw lastError ?? new Error('Task agent failed');
}
