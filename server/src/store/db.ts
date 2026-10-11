import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Approval, MemoryPoint, OmiTranscript, Run, Task } from '../types.js';

/**
 * Lightweight JSON-file persistence. Zero native dependencies (works on any
 * platform without compilation), with an in-memory cache and debounced writes.
 * Swap for Postgres/SQLite later — routes only talk to this module.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DbShape {
  runs: Run[];
  tasks: Task[];
  approvals: Approval[];
  omiTranscripts: OmiTranscript[];
  memories: (MemoryPoint & { vector: number[] })[];
}

const empty: DbShape = { runs: [], tasks: [], approvals: [], omiTranscripts: [], memories: [] };

let db: DbShape = { ...empty };
let writeTimer: NodeJS.Timeout | null = null;

export async function initDb(): Promise<void> {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    db = { ...empty, ...parsed };
  } catch {
    db = { ...empty };
    await persist();
  }
}

async function persist(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), 'utf-8');
  await fs.rename(tmp, DB_FILE);
}

function schedulePersist(): void {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    persist().catch((err) => console.error('[db] persist failed:', err));
  }, 150);
}

// ---- Runs ----

export function listRuns(): Run[] {
  return [...db.runs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getRun(id: string): Run | undefined {
  return db.runs.find((r) => r.id === id);
}

export function saveRun(run: Run): void {
  const idx = db.runs.findIndex((r) => r.id === run.id);
  if (idx >= 0) db.runs[idx] = run;
  else db.runs.push(run);
  schedulePersist();
}

// ---- Tasks ----

export function listTasks(): Task[] {
  return db.tasks;
}

export function getTask(id: string): Task | undefined {
  return db.tasks.find((t) => t.id === id);
}

export function saveTask(task: Task): void {
  const idx = db.tasks.findIndex((t) => t.id === task.id);
  if (idx >= 0) db.tasks[idx] = task;
  else db.tasks.push(task);
  schedulePersist();
}

// ---- Approvals ----

export function listApprovals(): Approval[] {
  return [...db.approvals].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getApproval(id: string): Approval | undefined {
  return db.approvals.find((a) => a.id === id);
}

export function saveApproval(approval: Approval): void {
  const idx = db.approvals.findIndex((a) => a.id === approval.id);
  if (idx >= 0) db.approvals[idx] = approval;
  else db.approvals.push(approval);
  schedulePersist();
}

// ---- Omi transcripts ----

export function listOmiTranscripts(): OmiTranscript[] {
  return [...db.omiTranscripts].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

export function saveOmiTranscript(t: OmiTranscript): void {
  db.omiTranscripts.unshift(t);
  if (db.omiTranscripts.length > 50) db.omiTranscripts.length = 50;
  schedulePersist();
}

// ---- Memory points (demo-mode persistence) ----

export function listMemoryPoints(): (MemoryPoint & { vector: number[] })[] {
  return db.memories;
}

export function saveMemoryPoint(point: MemoryPoint & { vector: number[] }): void {
  const idx = db.memories.findIndex((m) => m.id === point.id);
  if (idx >= 0) db.memories[idx] = point;
  else db.memories.push(point);
  schedulePersist();
}
