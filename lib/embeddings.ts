/**
 * Pluggable embedding provider for semantic search.
 *
 * Same pattern as article-quality-scoring.ts: prefer OpenAI if
 * configured, fall back to a local stub so the system still runs
 * without paid credentials. All outputs are 1536-dimension vectors
 * so they slot into the `search_embeddings.embedding vector(1536)`
 * column regardless of provider.
 *
 * Providers:
 *   - openai  via OPENAI_API_KEY → text-embedding-3-small (1536)
 *   - stub    deterministic hash-based vector for local dev
 *
 * The library is only ever called by the nightly embeddings cron
 * (batch) and the semantic search API (single query). Never throws
 * — failures return null so the caller can degrade gracefully.
 */

import { logger } from "@/lib/logger";

const log = logger("embeddings");

export type EmbeddingProvider = "openai" | "stub";

export interface EmbeddingResult {
  vector: number[]; // length 1536
  provider: EmbeddingProvider;
  model: string;
}

/**
 * Return the provider we'd use right now. Lets the cron log which
 * provider was active at embedding time.
 */
export function selectEmbeddingProvider(): EmbeddingProvider {
  if (process.env.OPENAI_API_KEY) return "openai";
  return "stub";
}

/**
 * Embed a single text string into a 1536-dim vector.
 * Returns null on provider failure.
 */
export async function embedText(text: string): Promise<EmbeddingResult | null> {
  const trimmed = text.trim().slice(0, 8000);
  if (!trimmed) return null;

  const provider = selectEmbeddingProvider();
  try {
    if (provider === "openai") {
      return await embedOpenAi(trimmed);
    }
    return embedStub(trimmed);
  } catch (err) {
    log.warn("embedText failed", {
      provider,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Batch embed. OpenAI supports up to 2048 inputs per request but
 * we chunk conservatively at 64 to keep memory + retry scope small.
 */
export async function embedBatch(texts: string[]): Promise<Array<EmbeddingResult | null>> {
  const results: Array<EmbeddingResult | null> = [];
  const chunks: string[][] = [];
  const clean = texts.map((t) => (t || "").trim().slice(0, 8000));
  for (let i = 0; i < clean.length; i += 64) chunks.push(clean.slice(i, i + 64));

  for (const chunk of chunks) {
    if (selectEmbeddingProvider() === "stub") {
      for (const t of chunk) results.push(t ? embedStub(t) : null);
      continue;
    }
    try {
      const batch = await embedOpenAiBatch(chunk);
      for (const r of batch) results.push(r);
    } catch (err) {
      log.warn("embedBatch chunk failed — falling through to stub", {
        err: err instanceof Error ? err.message : String(err),
      });
      for (const t of chunk) results.push(t ? embedStub(t) : null);
    }
  }
  return results;
}

// ─── OpenAI adapter ───────────────────────────────────────────────

const OPENAI_URL = "https://api.openai.com/v1/embeddings";
const OPENAI_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

async function embedOpenAi(text: string): Promise<EmbeddingResult> {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: OPENAI_MODEL, input: text, dimensions: 1536 }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`openai embeddings HTTP ${res.status}`);
  const body = (await res.json()) as {
    data?: Array<{ embedding: number[] }>;
  };
  const vector = body.data?.[0]?.embedding;
  if (!vector || vector.length !== 1536) {
    throw new Error("openai embeddings returned unexpected shape");
  }
  return {
    vector,
    provider: "openai",
    model: OPENAI_MODEL,
  };
}

async function embedOpenAiBatch(texts: string[]): Promise<Array<EmbeddingResult | null>> {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: OPENAI_MODEL, input: texts, dimensions: 1536 }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`openai embeddings batch HTTP ${res.status}`);
  const body = (await res.json()) as {
    data?: Array<{ embedding: number[]; index: number }>;
  };
  const out: Array<EmbeddingResult | null> = new Array(texts.length).fill(null);
  for (const row of body.data || []) {
    if (row.embedding?.length === 1536) {
      out[row.index] = {
        vector: row.embedding,
        provider: "openai",
        model: OPENAI_MODEL,
      };
    }
  }
  return out;
}

// ─── Stub adapter ─────────────────────────────────────────────────
/**
 * Deterministic "embedding" for local dev — hash the text into a
 * 1536-dim vector using a simple FNV-1a + sign-flip expansion.
 * Not semantically meaningful, but:
 *   - Same input → same vector (so the cache doesn't thrash)
 *   - Two very different strings have very different vectors
 *   - Two similar strings have slightly closer vectors (because
 *     overlapping substrings feed the same hash positions)
 *
 * This is ONLY useful to confirm the plumbing works end-to-end
 * without calling a paid API. Never ship production search on it.
 */
export function embedStub(text: string): EmbeddingResult {
  const vector = new Array(1536).fill(0) as number[];
  const lower = text.toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < lower.length; i++) {
    h ^= lower.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
    const idx = (h >>> 0) % 1536;
    vector[idx] += 1;
    // Distribute a secondary hit to a rotated position
    vector[(idx + 769) % 1536] += 0.5;
  }
  // Normalise to unit length so cosine similarity is well-defined
  let magnitude = 0;
  for (const v of vector) magnitude += v * v;
  magnitude = Math.sqrt(magnitude) || 1;
  for (let i = 0; i < vector.length; i++) vector[i] /= magnitude;
  return {
    vector,
    provider: "stub",
    model: "stub-fnv1a-1536",
  };
}

// ─── Cosine helpers (for tests) ───────────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    aMag += a[i] * a[i];
    bMag += b[i] * b[i];
  }
  if (aMag === 0 || bMag === 0) return 0;
  return dot / (Math.sqrt(aMag) * Math.sqrt(bMag));
}
