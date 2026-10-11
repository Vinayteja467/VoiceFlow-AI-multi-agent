import express from 'express';
import cors from 'cors';
import { config, DEMO_MODE } from './config/env.js';
import { initDb, listMemoryPoints } from './store/db.js';
import { hydrateMemoryStore } from './integrations/memory.js';
import { ensureSeedData } from './store/seedData.js';
import { voiceRouter } from './routes/voice.js';
import { runsRouter } from './routes/runs.js';
import { memoryRouter } from './routes/memory.js';
import { tasksRouter } from './routes/tasks.js';
import { approvalsRouter } from './routes/approvals.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mode: DEMO_MODE ? 'demo' : 'live',
    embeddingProvider: config.EMBEDDING_PROVIDER,
    collection: config.QDRANT_COLLECTION,
    time: new Date().toISOString(),
  });
});

app.use('/api/voice', voiceRouter);
app.use('/api/runs', runsRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/approvals', approvalsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler — one bad route never crashes the process.
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = config.PORT;

// ---- Startup sequence: init store → load persisted data → seed → listen ----
await initDb();
if (DEMO_MODE) {
  hydrateMemoryStore(listMemoryPoints());
}

// Ensure seed memories exist BEFORE the server accepts traffic, so the first
// request already has memory to retrieve. Idempotent — never duplicates data.
const seedResult = await ensureSeedData(false, (line) => console.log(`[server] seed ${line}`));
console.log(
  `[server] startup: ${DEMO_MODE ? 'demo' : 'live'} · ${seedResult.inserted} seeded, ${seedResult.skipped} already present, ${seedResult.total} memories available`,
);

app.listen(port, () => {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║            VoiceFlow AI — server                 ║
  ╠══════════════════════════════════════════════════╣
  ║  Mode : ${DEMO_MODE ? 'DEMO (no API keys needed)' : 'LIVE (Lyzr + Qdrant)'}`.padEnd(50) + `║
  ║  URL  : http://localhost:${String(port).padEnd(33)}║
  ╚══════════════════════════════════════════════════╝
  `);
});
