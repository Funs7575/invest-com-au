import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }),
}));

import {
  embedText,
  embedBatch,
  embedStub,
  cosineSimilarity,
  selectEmbeddingProvider,
} from "@/lib/embeddings";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.OPENAI_API_KEY;
  vi.restoreAllMocks();
});

afterEach(() => {
  for (const k of Object.keys(process.env)) delete process.env[k];
  Object.assign(process.env, ORIGINAL_ENV);
});

describe("selectEmbeddingProvider", () => {
  it("returns stub when no API key", () => {
    expect(selectEmbeddingProvider()).toBe("stub");
  });

  it("returns openai when OPENAI_API_KEY is set", () => {
    process.env.OPENAI_API_KEY = "sk-...";
    expect(selectEmbeddingProvider()).toBe("openai");
  });
});

describe("embedStub", () => {
  it("produces a 1536-dim unit vector", () => {
    const result = embedStub("hello world");
    expect(result.vector.length).toBe(1536);
    const magnitude = Math.sqrt(
      result.vector.reduce((s, v) => s + v * v, 0),
    );
    expect(magnitude).toBeCloseTo(1, 5);
  });

  it("is deterministic — same input always gives same vector", () => {
    const a = embedStub("The quick brown fox");
    const b = embedStub("The quick brown fox");
    expect(a.vector).toEqual(b.vector);
  });

  it("different inputs produce different vectors", () => {
    const a = embedStub("apples");
    const b = embedStub("submarine");
    const sim = cosineSimilarity(a.vector, b.vector);
    // Different short strings → low similarity
    expect(sim).toBeLessThan(0.9);
  });

  it("similar strings score higher than unrelated ones", () => {
    const a = embedStub("low fee broker australia");
    const b = embedStub("low fee broker");
    const c = embedStub("best recipe pavlova");
    const ab = cosineSimilarity(a.vector, b.vector);
    const ac = cosineSimilarity(a.vector, c.vector);
    expect(ab).toBeGreaterThan(ac);
  });
});

describe("embedText — stub path", () => {
  it("returns a stub result when no provider is configured", async () => {
    const r = await embedText("hello");
    expect(r).not.toBeNull();
    expect(r!.provider).toBe("stub");
    expect(r!.vector.length).toBe(1536);
  });

  it("returns null on empty input", async () => {
    expect(await embedText("")).toBeNull();
    expect(await embedText("   ")).toBeNull();
  });

  it("truncates long inputs to 8000 chars", async () => {
    const long = "a".repeat(20_000);
    const r = await embedText(long);
    expect(r).not.toBeNull();
    expect(r!.vector.length).toBe(1536);
  });
});

describe("embedBatch — stub path", () => {
  it("returns one result per input", async () => {
    const results = await embedBatch(["one", "two", "three"]);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r?.provider === "stub")).toBe(true);
  });

  it("handles empty strings gracefully (null entries)", async () => {
    const results = await embedBatch(["", "real content", ""]);
    expect(results[0]).toBeNull();
    expect(results[1]).not.toBeNull();
    expect(results[2]).toBeNull();
  });
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const v = [1, 0, 0];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0);
  });

  it("returns 0 for a zero vector", () => {
    expect(cosineSimilarity([0, 0, 0], [1, 0, 0])).toBe(0);
  });

  it("returns 0 for mismatched lengths", () => {
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
  });
});

describe("embedText — openai success path", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "sk-test";
  });

  it("calls the OpenAI endpoint and parses the response", async () => {
    const fakeVector = new Array(1536).fill(0).map((_, i) => (i === 0 ? 1 : 0));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ embedding: fakeVector }] }),
      })),
    );
    const r = await embedText("something");
    expect(r).not.toBeNull();
    expect(r!.provider).toBe("openai");
    expect(r!.vector.length).toBe(1536);
    expect(r!.vector[0]).toBe(1);
  });

  it("returns null on HTTP error (doesn't throw)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({}),
      })),
    );
    const r = await embedText("something");
    expect(r).toBeNull();
  });
});
