import { Router } from 'express';
import { z } from 'zod';
import * as db from '../store/db.js';

export const tasksRouter = Router();

const patchSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'done']).optional(),
  priority: z.enum(['P0', 'P1', 'P2']).optional(),
  title: z.string().min(1).max(200).optional(),
});

/** GET /api/tasks — all tasks across runs. */
tasksRouter.get('/', (req, res) => {
  const runId = req.query['runId'] as string | undefined;
  const tasks = runId ? db.listTasks().filter((t) => t.runId === runId) : db.listTasks();
  res.json({ tasks });
});

/** PATCH /api/tasks/:id — optimistic update from the kanban board. */
tasksRouter.patch('/:id', (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const task = db.getTask(req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  const updated = { ...task, ...parsed.data };
  db.saveTask(updated);
  res.json({ task: updated });
});
