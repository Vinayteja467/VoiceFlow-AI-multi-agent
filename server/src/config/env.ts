import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  LYZR_API_KEY: z.string().optional(),
  LYZR_ORCHESTRATOR_AGENT_ID: z.string().optional(),
  LYZR_RESEARCH_AGENT_ID: z.string().optional(),
  LYZR_PLANNING_AGENT_ID: z.string().optional(),
  LYZR_TASK_AGENT_ID: z.string().optional(),
  QDRANT_URL: z.string().optional(),
  QDRANT_API_KEY: z.string().optional(),
  QDRANT_COLLECTION: z.string().default('voiceflow_memory'),
  OPENAI_API_KEY: z.string().optional(),
  EMBEDDING_PROVIDER: z.enum(['openai', 'local']).default('local'),
  EMBEDDING_DIM: z.coerce.number().int().positive().default(256),
  OMI_WEBHOOK_SECRET: z.string().optional(),
  DEMO_MODE: z.coerce.boolean().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;

const lyzrLive =
  Boolean(config.LYZR_API_KEY) &&
  Boolean(config.LYZR_ORCHESTRATOR_AGENT_ID) &&
  Boolean(config.LYZR_RESEARCH_AGENT_ID) &&
  Boolean(config.LYZR_PLANNING_AGENT_ID) &&
  Boolean(config.LYZR_TASK_AGENT_ID);

const qdrantLive = Boolean(config.QDRANT_URL);

/**
 * DEMO_MODE runs the exact same pipeline with simulated agent outputs and an
 * in-memory vector store, so the product is demoable with zero API keys.
 * Auto-enabled when Lyzr or Qdrant credentials are missing.
 */
export const DEMO_MODE = config.DEMO_MODE ?? !(lyzrLive && qdrantLive);

export const EMBEDDING_DIM =
  config.EMBEDDING_PROVIDER === 'openai' ? 1536 : config.EMBEDDING_DIM;
