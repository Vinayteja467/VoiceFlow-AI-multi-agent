import { z } from 'zod';
import { DEMO_MODE } from '../config/env.js';
import { runAgent } from '../integrations/lyzr.js';
import type { Finding, PlanOutput, RetrievedMemory } from '../types.js';
import { PLANNING_SYSTEM_PROMPT } from './prompts/planning.js';
import { simulatePlanning } from './demo.js';
import { extractJson } from './json.js';

export const planningOutputSchema = z.object({
  comparison: z
    .array(
      z.object({
        option: z.string(),
        pros: z.array(z.string()),
        cons: z.array(z.string()),
        verdict: z.string(),
      }),
    )
    .min(1),
  weekPlan: z
    .array(
      z.object({
        day: z.string(),
        block: z.string(),
        priority: z.enum(['P0', 'P1', 'P2']),
        rationale: z.string(),
      }),
    )
    .min(1),
  rationale: z.string(),
});

export type PlanningOutput = z.infer<typeof planningOutputSchema>;

export interface PlanningInput {
  request: string;
  research: { findings: Finding[] };
  memories: RetrievedMemory[];
}

function buildMessage(input: PlanningInput): string {
  const memoryBlock =
    input.memories.length > 0
      ? `\n\nRETRIEVED MEMORIES (honor stated preferences/constraints):\n${input.memories
          .map((m, i) => `  ${i + 1}. [${m.type} | score ${m.score.toFixed(2)}] ${m.text}`)
          .join('\n')}`
      : '\n\nRETRIEVED MEMORIES: none.';
  return (
    `USER REQUEST:\n${input.request}\n\n` +
    `RESEARCH FINDINGS (from the Research agent — build on these):\n${JSON.stringify(input.research.findings, null, 2)}` +
    memoryBlock
  );
}

/** Run the Planning agent. Live mode calls Lyzr; demo mode simulates. One retry on invalid JSON. */
export async function runPlanningAgent(
  input: PlanningInput,
  sessionId: string,
): Promise<PlanningOutput> {
  if (DEMO_MODE) {
    return simulatePlanning(input.request, input.research, input.memories);
  }

  let message = `${PLANNING_SYSTEM_PROMPT}\n\n${buildMessage(input)}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await runAgent('planning', message, sessionId);
      return planningOutputSchema.parse(extractJson(raw));
    } catch (err) {
      lastError = err as Error;
      if (attempt === 0) {
        message +=
          '\n\nYour previous output was not valid JSON matching the required schema. ' +
          'Respond with ONLY the corrected JSON object, no markdown, no commentary.';
      }
    }
  }
  throw lastError ?? new Error('Planning agent failed');
}
