import type { OmiTranscript } from '../types.js';

/**
 * Omi webhook adapter.
 *
 * Verified against https://docs.omi.me/doc/developer/apps/Integrations:
 *  - Real-time transcript: POST ?session_id=&uid= with a JSON array of segments
 *      [{ text, speaker, speakerId, is_user, start, end }, ...]
 *  - Memory trigger:      POST ?uid= with a memory object containing
 *      transcript_segments[] and structured { title, overview, action_items, ... }
 *
 * ASSUMPTION (documented in README): Omi does not sign webhook payloads, so if
 * OMI_WEBHOOK_SECRET is set we require the `x-omi-secret` header to match.
 */

export interface NormalizedOmiInput {
  text: string;
  source: 'omi';
  sessionId?: string;
  uid?: string;
  segments: { text: string; speaker?: string; is_user?: boolean }[];
  memory?: {
    title?: string;
    overview?: string;
    category?: string;
    actionItems?: { description: string; completed: boolean }[];
  };
}

type OmiWebhookBody =
  | unknown[]
  | {
      transcript_segments?: { text: string; speaker?: string; speakerId?: number; is_user?: boolean; start?: number; end?: number }[];
      structured?: {
        title?: string;
        overview?: string;
        emoji?: string;
        category?: string;
        action_items?: { description: string; completed?: boolean }[];
        events?: unknown[];
      };
    };

export function normalizeOmiWebhook(
  body: OmiWebhookBody,
  query: Record<string, unknown>,
): NormalizedOmiInput {
  const sessionId = typeof query['session_id'] === 'string' ? query['session_id'] : undefined;
  const uid = typeof query['uid'] === 'string' ? query['uid'] : undefined;

  // Real-time transcript: array of segments
  if (Array.isArray(body)) {
    const segments = body
      .filter((s): s is { text: string; speaker?: string; is_user?: boolean } => Boolean(s && typeof (s as { text?: unknown }).text === 'string'))
      .map((s) => ({ text: s.text, speaker: s.speaker, is_user: s.is_user }));
    return {
      text: segments.map((s) => s.text).join(' ').trim(),
      source: 'omi',
      sessionId,
      uid,
      segments,
    };
  }

  // Memory trigger: object with transcript_segments + structured
  const segments = (body.transcript_segments ?? []).map((s) => ({
    text: s.text,
    speaker: s.speaker,
    is_user: s.is_user,
  }));
  const text = segments.map((s) => s.text).join(' ').trim();
  return {
    text,
    source: 'omi',
    sessionId,
    uid,
    segments,
    memory: body.structured
      ? {
          title: body.structured.title,
          overview: body.structured.overview,
          category: body.structured.category,
          actionItems: (body.structured.action_items ?? []).map((a) => ({
            description: a.description,
            completed: Boolean(a.completed),
          })),
        }
      : undefined,
  };
}

export function toTranscript(input: NormalizedOmiInput, id: string): OmiTranscript {
  return {
    id,
    text: input.text,
    source: 'omi',
    sessionId: input.sessionId,
    uid: input.uid,
    receivedAt: new Date().toISOString(),
  };
}
