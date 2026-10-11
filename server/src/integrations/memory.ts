import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from '../config/env.js';
import type { MemoryPoint, RetrievedMemory } from '../types.js';

/**
 * Memory store adapter. Two interchangeable implementations:
 *  - QdrantMemoryStore  → real Qdrant collection (cosine distance)
 *  - InMemoryMemoryStore → deterministic local vector store for DEMO_MODE
 * Both expose the same interface so the orchestrator never cares which is live.
 */

export interface MemorySearchResult {
  id: string;
  text: string;
  type: MemoryPoint['type'];
  tags: string[];
  runId?: string;
  createdAt: string;
  score: number;
}

export interface MemoryStore {
  upsert(point: MemoryPoint & { vector: number[] }): Promise<void>;
  search(vector: number[], limit: number, threshold: number): Promise<MemorySearchResult[]>;
  list(): Promise<MemorySearchResult[]>;
  count(): Promise<number>;
  delete(id: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Qdrant implementation
// ---------------------------------------------------------------------------

export class QdrantMemoryStore implements MemoryStore {
  private client: QdrantClient;
  private ready = false;

  constructor() {
    const url = new URL(config.QDRANT_URL!);
    this.client = new QdrantClient({
      host: url.hostname,
      port: url.port ? Number(url.port) : undefined,
      apiKey: config.QDRANT_API_KEY || undefined,
    });
  }

  private async ensure(dim: number): Promise<void> {
    if (this.ready) return;
    const collections = await this.client.getCollections();
    const exists = collections.collections?.some((c) => c.name === config.QDRANT_COLLECTION);
    if (!exists) {
      await this.client.createCollection(config.QDRANT_COLLECTION, {
        vectors: { size: dim, distance: 'Cosine' },
      });
    }
    this.ready = true;
  }

  async upsert(point: MemoryPoint & { vector: number[] }): Promise<void> {
    await this.ensure(point.vector.length);
    await this.client.upsert(config.QDRANT_COLLECTION, {
      wait: true,
      points: [
        {
          id: point.id,
          vector: point.vector,
          payload: {
            text: point.text,
            type: point.type,
            tags: point.tags,
            runId: point.runId ?? null,
            createdAt: point.createdAt,
          },
        },
      ],
    });
  }

  async search(vector: number[], limit: number, threshold: number): Promise<MemorySearchResult[]> {
    await this.ensure(vector.length);
    // js-client-rest 1.x: universal `query` endpoint; raw vector = nearest-neighbor search.
    const res = await this.client.query(config.QDRANT_COLLECTION, {
      query: vector,
      limit,
      score_threshold: threshold,
      with_payload: true,
    });
    return (res.points ?? []).map((r) => {
      const p = (r.payload ?? {}) as Record<string, unknown>;
      return {
        id: String(r.id),
        text: String(p['text'] ?? ''),
        type: (p['type'] as MemoryPoint['type']) ?? 'fact',
        tags: (p['tags'] as string[]) ?? [],
        runId: (p['runId'] as string) ?? undefined,
        createdAt: String(p['createdAt'] ?? ''),
        score: r.score,
      };
    });
  }

  async list(): Promise<MemorySearchResult[]> {
    await this.ensure(0);
    const res = await this.client.scroll(config.QDRANT_COLLECTION, { limit: 500 });
    return (res.points ?? []).map((r) => {
      const p = (r.payload ?? {}) as Record<string, unknown>;
      return {
        id: String(r.id),
        text: String(p['text'] ?? ''),
        type: (p['type'] as MemoryPoint['type']) ?? 'fact',
        tags: (p['tags'] as string[]) ?? [],
        runId: (p['runId'] as string) ?? undefined,
        createdAt: String(p['createdAt'] ?? ''),
        score: 1,
      };
    });
  }

  async count(): Promise<number> {
    await this.ensure(0);
    const res = await this.client.getCollection(config.QDRANT_COLLECTION);
    return res.points_count ?? 0;
  }

  async delete(id: string): Promise<void> {
    await this.client.delete(config.QDRANT_COLLECTION, { points: [id] });
  }
}

// ---------------------------------------------------------------------------
// In-memory implementation (DEMO_MODE) — cosine similarity over stored vectors
// ---------------------------------------------------------------------------

interface StoredPoint extends MemoryPoint {
  vector: number[];
}

export class InMemoryMemoryStore implements MemoryStore {
  private points: StoredPoint[] = [];

  async upsert(point: MemoryPoint & { vector: number[] }): Promise<void> {
    const idx = this.points.findIndex((p) => p.id === point.id);
    const stored: StoredPoint = {
      id: point.id,
      text: point.text,
      type: point.type,
      tags: point.tags,
      runId: point.runId,
      createdAt: point.createdAt,
      vector: point.vector,
    };
    if (idx >= 0) this.points[idx] = stored;
    else this.points.push(stored);
  }

  async search(vector: number[], limit: number, threshold: number): Promise<MemorySearchResult[]> {
    const scored = this.points
      .map((p) => ({ p, score: cosine(vector, p.vector) }))
      .filter((s) => s.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return scored.map(({ p, score }) => ({
      id: p.id,
      text: p.text,
      type: p.type,
      tags: p.tags,
      runId: p.runId,
      createdAt: p.createdAt,
      score,
    }));
  }

  async list(): Promise<MemorySearchResult[]> {
    return this.points.map((p) => ({
      id: p.id,
      text: p.text,
      type: p.type,
      tags: p.tags,
      runId: p.runId,
      createdAt: p.createdAt,
      score: 1,
    }));
  }

  async count(): Promise<number> {
    return this.points.length;
  }

  async delete(id: string): Promise<void> {
    this.points = this.points.filter((p) => p.id !== id);
  }

  /** Test/seed helper. */
  all(): StoredPoint[] {
    return this.points;
  }

  /** Hydrate from persisted db (demo-mode restart survival). */
  hydrate(points: StoredPoint[]): void {
    for (const p of points) {
      if (!this.points.some((x) => x.id === p.id)) this.points.push(p);
    }
  }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    na += (a[i] ?? 0) ** 2;
    nb += (b[i] ?? 0) ** 2;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

let instance: MemoryStore | null = null;

export function getMemoryStore(): MemoryStore {
  if (!instance) {
    instance = config.QDRANT_URL ? new QdrantMemoryStore() : new InMemoryMemoryStore();
  }
  return instance;
}

/** Hydrate the demo in-memory store from persisted db points. */
export function hydrateMemoryStore(points: (MemoryPoint & { vector: number[] })[]): void {
  const store = getMemoryStore();
  if (store instanceof InMemoryMemoryStore) {
    store.hydrate(points);
  }
}
