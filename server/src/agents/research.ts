import { z } from 'zod';
import { DEMO_MODE } from '../config/env.js';
import { runAgent } from '../integrations/lyzr.js';
import type { Finding, RetrievedMemory } from '../types.js';
import { RESEARCH_SYSTEM_PROMPT } from './prompts/research.js';
import { simulateResearch } from './demo.js';
import { extractJson } from './json.js';

export const researchOutputSchema = z.object({
  findings: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string(),
        source: z.string(),
        date: z.string(),
        relevanceScore: z.number().min(0).max(1),
        tags: z.array(z.string()),
      }),
    )
    .min(1),
});

export type ResearchOutput = z.infer<typeof researchOutputSchema>;

export interface ResearchInput {
  request: string;
  memories: RetrievedMemory[];
}

function buildMessage(input: ResearchInput): string {
  const memoryBlock =
    input.memories.length > 0
      ? `\n\nRETRIEVED MEMORIES (use them — they are the user's past context):\n${input.memories
          .map((m, i) => `  ${i + 1}. [${m.type} | score ${m.score.toFixed(2)}] ${m.text}`)
          .join('\n')}`
      : '\n\nRETRIEVED MEMORIES: none.';
  return `USER REQUEST:\n${input.request}${memoryBlock}`;
}

/**
 * Run the Research agent. Live mode calls Lyzr; demo mode simulates.
 * One retry on invalid JSON output.
 */
export async function runResearchAgent(
  input: ResearchInput,
  sessionId: string,
): Promise<ResearchOutput> {
  if (DEMO_MODE) {
    return simulateResearch(input.request, input.memories);
  }

  let message = `${RESEARCH_SYSTEM_PROMPT}\n\n${buildMessage(input)}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await runAgent('research', message, sessionId);
      const parsed = researchOutputSchema.parse(extractJson(raw));
      return parsed;
    } catch (err) {
      lastError = err as Error;
      if (attempt === 0) {
        message +=
          '\n\nYour previous output was not valid JSON matching the required schema. ' +
          'Respond with ONLY the corrected JSON object, no markdown, no commentary.';
      }
    }
  }
  throw lastError ?? new Error('Research agent failed');
}
