import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

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
    mockFrom.mockImplementation(() => makeChain({ error: { message: "relation does not exist" } }));
    const res = await GET();
    expect(res.status).toBe(502);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/Failed to load quiz data/);
  });

  it("returns brokers and never returns quiz_weights", async () => {
    const brokers = [{ id: 1, slug: "stake", status: "active" }];
    mockFrom.mockImplementation(() => makeChain({ data: brokers }));
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.brokers).toEqual(brokers);
    // Weights are no longer shipped to the browser — scoring is server-side.
    expect(json).not.toHaveProperty("quiz_weights");
  });

  it("strips internal commercial fields from broker rows", async () => {
    const brokers = [
      {
        slug: "stake",
        status: "active",
        rating: 4.5,
        cpa_value: 400,
        monthly_sponsorship_fee: 1500,
        affiliate_priority: "high",
        commission_type: "cpa",
        commission_value: 400,
        estimated_epc: 12.5,
        promoted_placement: true,
      },
    ];
    mockFrom.mockImplementation(() => makeChain({ data: brokers }));
    const res = await GET();
    const json = (await res.json()) as { brokers: Record<string, unknown>[] };
    const b = json.brokers[0];
    expect(b.slug).toBe("stake");
    expect(b.rating).toBe(4.5);
    for (const f of [
      "cpa_value",
      "monthly_sponsorship_fee",
      "affiliate_priority",
      "commission_type",
      "commission_value",
      "estimated_epc",
      "promoted_placement",
    ]) {
      expect(b).not.toHaveProperty(f);
    }
  });

  it("sets public Cache-Control header", async () => {
    mockFrom.mockImplementation(() => makeChain({ data: [] }));
    const res = await GET();
    const cc = res.headers.get("Cache-Control") ?? "";
    expect(cc).toMatch(/public/);
    expect(cc).toMatch(/max-age/);
    expect(cc).toMatch(/stale-while-revalidate/);
  });
});
