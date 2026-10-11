import { initDb, listMemoryPoints } from './store/db.js';
import { hydrateMemoryStore } from './integrations/memory.js';
import { ensureSeedData } from './store/seedData.js';
import { DEMO_MODE, config } from './config/env.js';

/**
 * Seed CLI — stores the sample memories so the first demo run shows retrieval
 * visibly influencing the agents. Idempotent: safe to run repeatedly.
 *
 *   npm run seed          # insert any missing seed points
 *   npm run seed -- --force   # re-upsert all seed points
 */
async function main() {
  await initDb();
  // Hydrate so this process sees already-persisted seed ids and skips them.
  if (DEMO_MODE) hydrateMemoryStore(listMemoryPoints());

  const force = process.argv.includes('--force');
  console.log(
    `[seed] mode=${DEMO_MODE ? 'demo' : 'live'} provider=${config.EMBEDDING_PROVIDER} collection=${config.QDRANT_COLLECTION}${force ? ' (force)' : ''}`,
  );

  const result = await ensureSeedData(force, (line) => console.log(`[seed] ${line}`));
  console.log(
    `[seed] done — ${result.inserted} inserted, ${result.skipped} already present, ${result.total} total in store.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
