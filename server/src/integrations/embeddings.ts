import { config, EMBEDDING_DIM } from '../config/env.js';

/**
 * Embedding providers.
 * - "openai": text-embedding-3-small (1536 dims) — requires OPENAI_API_KEY
 * - "local":  deterministic hashing embedder (default, zero dependencies)
 *
 * The local embedder is fully deterministic: the same text always produces the
 * same vector, which is what makes the demo memory loop work with no API keys.
 * It uses token unigrams + bigrams hashed into a fixed-dimension bag and
 * L2-normalized, so texts sharing vocabulary get high cosine similarity.
 */

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function localEmbed(text: string): number[] {
  const vec = new Array<number>(config.EMBEDDING_DIM).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);

  for (const tok of tokens) {
    vec[fnv1a(tok) % vec.length]! += 1;
  }
  for (let i = 0; i < tokens.length - 1; i++) {
    const idx = fnv1a(`${tokens[i]}_${tokens[i + 1]}`) % vec.length;
    vec[idx]! += 0.5;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export async function openAIEmbed(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI embeddings failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { data: { embedding: number[] }[] };
  return data.data[0]!.embedding;
}

/** Embed a batch of texts (used by seed + memory save). */
export async function embed(text: string): Promise<number[]> {
  if (config.EMBEDDING_PROVIDER === 'openai') {
    if (!config.OPENAI_API_KEY) {
      console.warn('[embeddings] EMBEDDING_PROVIDER=openai but no OPENAI_API_KEY — using local fallback');
      return localEmbed(text);
    }
    return openAIEmbed(text);
  }
  return localEmbed(text);
}

export function embeddingDim(): number {
  return EMBEDDING_DIM;
}
