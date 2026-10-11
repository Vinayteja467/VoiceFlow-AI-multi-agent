import { Router } from 'express';
import { z } from 'zod';
import * as db from '../store/db.js';

export const approvalsRouter = Router();

const actionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  edits: z.record(z.string(), z.unknown()).optional(),
});

/** GET /api/approvals — all approvals (pending first). */
approvalsRouter.get('/', (_req, res) => {
  const all = db.listApprovals();
  res.json({
    approvals: all,
    pending: all.filter((a) => a.status === 'pending').length,
  });
});

/**
 * POST /api/approvals/:id — approve or reject a queued external action.
 * Approving records the decision in the audit log. The actual send/calendar
 * creation is intentionally NOT executed here — this is the human gate.
 */
approvalsRouter.post('/:id', (req, res) => {
  const parsed = actionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const approval = db.getApproval(req.params.id);
  if (!approval) {
    res.status(404).json({ error: 'Approval not found' });
    return;
  }
  if (approval.status !== 'pending') {
    res.status(409).json({ error: `Approval already ${approval.status}` });
    return;
  }

  const now = new Date().toISOString();
  const payload =
    parsed.data.action === 'approve' && parsed.data.edits
      ? { ...approval.payload, ...parsed.data.edits }
      : approval.payload;

  const updated = {
    ...approval,
    status: parsed.data.action === 'approve' ? ('approved' as const) : ('rejected' as const),
    payload,
    resolvedAt: now,
    audit: [
      ...approval.audit,
      {
        at: now,
        action: parsed.data.action,
        detail:
          parsed.data.action === 'approve'
            ? parsed.data.edits
              ? `Approved with edits: ${JSON.stringify(parsed.data.edits)}`
              : 'Approved — queued for execution by the user outside this system'
            : 'Rejected — action discarded',
      },
    ],
  };
  db.saveApproval(updated);
  res.json({ approval: updated });
});
