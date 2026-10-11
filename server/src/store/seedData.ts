import { DEMO_MODE } from '../config/env.js';
import { embed } from '../integrations/embeddings.js';
import { getMemoryStore } from '../integrations/memory.js';
import { saveMemoryPoint } from './db.js';
import type { MemoryType } from '../types.js';

/**
 * Seed data for the demo. Shared by the `npm run seed` CLI and the server's
 * startup sequence so there is exactly ONE seeding code path and no risk of
 * the server booting with an empty store.
 */

export interface SeedMemory {
  text: string;
  type: MemoryType;
  tags: string[];
}

export const SEED_MEMORIES: SeedMemory[] = [
  {
    text: 'User is preparing for AI hackathons this season — prefers weekend events with cash prizes and has a teammate who is a frontend developer.',
    type: 'fact',
    tags: ['hackathon', 'preferences', 'team'],
  },
  {
    text: 'Previous research finding: Lablab.ai weekly AI challenges offer prizes up to $5,000 and accept solo or team entries with a 48-hour build window.',
    type: 'finding',
    tags: ['hackathon', 'lablab', 'prizes'],
  },
  {
    text: 'Decision: focus on agentic-AI tracks this year — judges weight novelty (30%) and multi-agent systems with distinct visible roles score highest.',
    type: 'decision',
    tags: ['hackathon', 'strategy', 'judging'],
  },
  {
    text: 'User prefers morning deep-work blocks (09:00-11:00) and wants calendar events created only after explicit approval.',
    type: 'fact',
    tags: ['preferences', 'calendar', 'scheduling'],
  },
  {
    text: 'Planning memory: the user’s weekly template is Mon-Wed build, Thu mentor review, Fri integration, weekend polish — P0 tasks must finish by Friday EOD.',
    type: 'plan',
    tags: ['planning', 'weekly-template', 'deadlines'],
  },
  {
    text: 'Finding: university-hosted AI events (MIT, Stanford) offer free entry with travel grants but are student-focused — good for learning, weaker for recruiting.',
    type: 'finding',
    tags: ['hackathon', 'university', 'travel'],
  },
  {
    text: 'Past run insight: teams that time-box a 2-hour proof-of-concept spike on Monday ship 2x more often than teams that start building immediately.',
    type: 'finding',
    tags: ['process', 'spike', 'productivity'],
  },
  {
    text: 'User is based in IST (UTC+5:30) — schedule calendar blocks and deadline reminders in that timezone.',
    type: 'fact',
    tags: ['timezone', 'preferences'],
  },
];

export interface SeedResult {
  inserted: number;
  skipped: number;
  total: number;
}

/**
 * Idempotently insert the seed memories. Points already present (matched by the
 * stable `seed-N` id) are skipped, so existing/generated data is preserved and
 * repeated boots or `npm run seed` runs never duplicate rows.
 *
 * @param force - re-upsert seed points even if they already exist.
 */
export async function ensureSeedData(
  force = false,
  log: (msg: string) => void = () => {},
): Promise<SeedResult> {
  const store = getMemoryStore();
  const existingIds = new Set((await store.list()).map((m) => m.id));

  let inserted = 0;
  let skipped = 0;
  for (let i = 0; i < SEED_MEMORIES.length; i++) {
    const m = SEED_MEMORIES[i]!;
    const id = `seed-${i + 1}`;
    if (!force && existingIds.has(id)) {
      skipped++;
      continue;
    }
    const createdAt = new Date(Date.now() - (SEED_MEMORIES.length - i) * 86_400_000).toISOString();
    const vector = await embed(m.text);
    await store.upsert({ id, text: m.text, type: m.type, tags: m.tags, createdAt, vector });
    // Mirror to the local db so demo-mode restarts keep the seed data.
    if (DEMO_MODE) {
      saveMemoryPoint({ id, text: m.text, type: m.type, tags: m.tags, createdAt, vector });
    }
    inserted++;
    log(`+ [${m.type}] ${m.text.slice(0, 70)}…`);
  }

  return { inserted, skipped, total: await store.count() };
}
