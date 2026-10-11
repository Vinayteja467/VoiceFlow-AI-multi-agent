import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config/env.js';
import { normalizeOmiWebhook, toTranscript } from '../integrations/omi.js';
import * as db from '../store/db.js';
import { randomUUID } from 'node:crypto';

export const voiceRouter = Router();

const textSchema = z.object({
  text: z.string().min(1).max(2000),
  source: z.enum(['browser', 'text']).default('text'),
});

/**
 * POST /api/voice/omi-webhook
 * Receives Omi real-time transcript segments or memory objects.
 * Omi docs: POST ?session_id=&uid= with a JSON array of segments (real-time)
 * or a memory object (memory trigger). See integrations/omi.ts.
 */
voiceRouter.post('/omi-webhook', (req, res) => {
  // Optional shared-secret check (Omi does not sign payloads — see README).
  if (config.OMI_WEBHOOK_SECRET) {
    const provided = req.header('x-omi-secret') ?? (req.query['secret'] as string | undefined);
    if (provided !== config.OMI_WEBHOOK_SECRET) {
      res.status(401).json({ error: 'Invalid Omi webhook secret' });
      return;
    }
  }

  try {
    const normalized = normalizeOmiWebhook(req.body as never, req.query as Record<string, unknown>);
    if (!normalized.text) {
      res.status(422).json({ error: 'Omi webhook contained no transcript text' });
      return;
    }
    const transcript = toTranscript(normalized, randomUUID());
    db.saveOmiTranscript(transcript);
    res.json({ ok: true, id: transcript.id, text: transcript.text });
  } catch (err) {
    res.status(400).json({ error: `Failed to parse Omi webhook: ${(err as Error).message}` });
  }
});

/** POST /api/voice/text — browser mic / text input fallback. */
voiceRouter.post('/text', (req, res) => {
  const parsed = textSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  res.json({ ok: true, text: parsed.data.text, source: parsed.data.source });
});

/** GET /api/voice/omi/latest — latest incoming Omi transcript for the UI. */
voiceRouter.get('/omi/latest', (_req, res) => {
  const all = db.listOmiTranscripts();
  res.json({ transcript: all[0] ?? null, count: all.length });
});
