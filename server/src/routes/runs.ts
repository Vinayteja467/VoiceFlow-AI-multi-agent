import { Router } from 'express';
import { z } from 'zod';
import { orchestrator } from '../agents/orchestrator.js';
import * as db from '../store/db.js';
import type { StepEvent } from '../types.js';

export const runsRouter = Router();

const createRunSchema = z.object({
  text: z.string().min(1).max(2000),
  source: z.enum(['omi', 'browser', 'text']).default('text'),
});

/** POST /api/runs — start a pipeline run. Returns { runId }; stream via SSE. */
runsRouter.post('/', async (req, res) => {
  const parsed = createRunSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const runId = await orchestrator.startRun({ text: parsed.data.text, source: parsed.data.source });
  res.status(202).json({ runId });
});

/** GET /api/runs — list all runs (newest first). */
runsRouter.get('/', (_req, res) => {
  res.json({ runs: db.listRuns() });
});

/** GET /api/runs/:id — full run state. */
runsRouter.get('/:id', (req, res) => {
  const run = orchestrator.getRun(req.params.id) ?? db.getRun(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }
  res.json({ run });
});

/**
 * GET /api/runs/:id/stream — SSE stream of step events.
 * Replays stored events instantly for finished runs, then live events as the
 * pipeline progresses. Closes on completion or client disconnect.
 */
runsRouter.get('/:id/stream', (req, res) => {
  const runId = req.params.id;
  const run = orchestrator.getRun(runId) ?? db.getRun(runId);
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`retry: 3000\n\n`);

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Replay stored events (covers reconnects + finished-run replay).
  for (const step of run.steps) {
    send('step', step);
  }
  if (run.status !== 'running') {
    send('done', { runId });
    res.end();
    return;
  }

  const unsubscribe = orchestrator.subscribe(runId, (e: StepEvent) => {
    send('step', e);
  });
  const onDone = (payload: { runId: string }) => {
    if (payload.runId === runId) {
      send('done', payload);
      cleanup();
      res.end();
    }
  };
  orchestrator.on('done', onDone);

  const heartbeat = setInterval(() => res.write(`: hb\n\n`), 15_000);

  const cleanup = () => {
    clearInterval(heartbeat);
    unsubscribe();
    orchestrator.off('done', onDone);
  };
  req.on('close', cleanup);
});
