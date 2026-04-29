import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockFrom = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET } from "@/app/api/quiz/data/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeChain(result: { data?: unknown; error?: { message: string } | null }) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order"]) c[m] = vi.fn(() => c);
  c.then = (resolve: (v: typeof result) => unknown) =>
    Promise.resolve(resolve({ data: result.data ?? null, error: result.error ?? null }));
  return c;
}

const OLD_ENV = process.env;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/quiz/data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...OLD_ENV,
      NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    };
  });

  it("returns 503 when env vars are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const res = await GET();
    expect(res.status).toBe(503);
  });

  it("returns 503 when anon key is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const res = await GET();
    expect(res.status).toBe(503);
  });

  it("returns 502 when brokers fetch errors", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ error: { message: "relation does not exist" } });
      return makeChain({ data: [] });
    });
    const res = await GET();
    expect(res.status).toBe(502);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/Failed to load quiz data/);
  });

  it("returns 200 with brokers + quiz_weights on success", async () => {
    const brokers = [{ id: 1, slug: "stake", status: "active" }];
    const weights = [{ id: 1, label: "low_risk", weight: 0.5 }];
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      return makeChain({ data: call === 1 ? brokers : weights });
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json() as { brokers: unknown[]; quiz_weights: unknown[] };
    expect(json.brokers).toEqual(brokers);
    expect(json.quiz_weights).toEqual(weights);
  });

  it("sets public Cache-Control header", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      return makeChain({ data: [] });
    });
    const res = await GET();
    const cc = res.headers.get("Cache-Control") ?? "";
    expect(cc).toMatch(/public/);
    expect(cc).toMatch(/max-age/);
    expect(cc).toMatch(/stale-while-revalidate/);
  });

  it("returns empty quiz_weights when that query errors but brokers succeed", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: [{ slug: "stake" }] });
      return makeChain({ data: null, error: { message: "quiz_weights missing" } });
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json() as { quiz_weights: unknown };
    expect(json.quiz_weights).toEqual([]);
  });
});
