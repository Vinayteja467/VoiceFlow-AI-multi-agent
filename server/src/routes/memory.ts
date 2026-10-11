import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config/env.js';
import { embed } from '../integrations/embeddings.js';
import { getMemoryStore } from '../integrations/memory.js';

export const memoryRouter = Router();

const searchSchema = z.object({
  q: z.string().min(1).max(500),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

/** GET /api/memory/search?q= — semantic search over the vector store. */
memoryRouter.get('/search', async (req, res) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  try {
    const vector = await embed(parsed.data.q);
    const store = getMemoryStore();
    const results = await store.search(vector, parsed.data.limit, 0.1);
    res.json({ results, provider: config.EMBEDDING_PROVIDER, collection: config.QDRANT_COLLECTION });
  } catch (err) {
    res.status(500).json({ error: `Memory search failed: ${(err as Error).message}` });
  }
});

/** GET /api/memory — list all stored memories. */
memoryRouter.get('/', async (_req, res) => {
  try {
    const store = getMemoryStore();
    const [results, count] = await Promise.all([store.list(), store.count()]);
    res.json({ results, count, provider: config.EMBEDDING_PROVIDER });
  } catch (err) {
    res.status(500).json({ error: `Failed to list memories: ${(err as Error).message}` });
  }
});
