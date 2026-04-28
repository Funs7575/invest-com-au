import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

const mockServerFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockServerFrom }),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: vi.fn(() => "https://invest.com.au"),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

import { POST, GET } from "@/app/api/lead-outcome/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const LEAD_ID = "550e8400-e29b-41d4-a716-446655440000";
const ADVISOR_ID = "advisor-99";

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/lead-outcome", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function makeGet(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/lead-outcome");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

/** Build a supabase-from chain for single-row reads + updates */
function makeChain(opts: {
  selectData?: unknown;
  selectError?: unknown;
  updateError?: unknown;
} = {}) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.single = vi.fn(() =>
    Promise.resolve({ data: opts.selectData ?? null, error: opts.selectError ?? null })
  );
  c.update = vi.fn(() => c);
  // update chain resolves via .eq() — track call count
  let callCount = 0;
  const origEq = c.eq as ReturnType<typeof vi.fn>;
  c.eq = vi.fn((...args: unknown[]) => {
    callCount++;
    // The update's .eq() is the terminal call after .update()
    if (callCount > 1 && opts.updateError !== undefined) {
      return Promise.resolve({ error: opts.updateError });
    }
    return callCount > 1 ? Promise.resolve({ error: null }) : c;
  });
  return c;
}

// ── POST tests ─────────────────────────────────────────────────────────────────

describe("POST /api/lead-outcome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost({ lead_id: LEAD_ID, outcome: "contacted" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when lead_id is missing", async () => {
    const res = await POST(makePost({ outcome: "contacted" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/lead_id.*outcome/i);
  });

  it("returns 400 when outcome is missing", async () => {
    const res = await POST(makePost({ lead_id: LEAD_ID }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid outcome value", async () => {
    const res = await POST(makePost({ lead_id: LEAD_ID, outcome: "cancelled" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid outcome/i);
  });

  it("returns 404 when lead not found", async () => {
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } });
    mockServerFrom.mockReturnValue(chain);

    const res = await POST(makePost({ lead_id: LEAD_ID, outcome: "contacted" }));
    expect(res.status).toBe(404);
  });

  it("returns 403 when advisor_id doesn't match the lead's professional_id", async () => {
    let callCount = 0;
    mockServerFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // SELECT lead
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.single = vi.fn().mockResolvedValue({
          data: { id: LEAD_ID, professional_id: "advisor-other" },
          error: null,
        });
        return c;
      }
      return { update: vi.fn() };
    });

    const res = await POST(
      makePost({ lead_id: LEAD_ID, outcome: "contacted", advisor_id: ADVISOR_ID })
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 success on valid outcome update", async () => {
    let callCount = 0;
    mockServerFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.single = vi.fn().mockResolvedValue({
          data: { id: LEAD_ID, professional_id: ADVISOR_ID },
          error: null,
        });
        return c;
      }
      // UPDATE chain
      const c: Record<string, unknown> = {};
      c.update = vi.fn(() => c);
      c.eq = vi.fn(() => Promise.resolve({ error: null }));
      return c;
    });

    const res = await POST(makePost({ lead_id: LEAD_ID, outcome: "contacted" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.outcome).toBe("contacted");
  });

  it("includes sale_price_cents and success_fee_cents in payload when outcome is 'converted'", async () => {
    let callCount = 0;
    let updatePayload: unknown;
    mockServerFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.single = vi.fn().mockResolvedValue({
          data: { id: LEAD_ID, professional_id: ADVISOR_ID },
          error: null,
        });
        return c;
      }
      const c: Record<string, unknown> = {};
      c.update = vi.fn((payload: unknown) => {
        updatePayload = payload;
        return c;
      });
      c.eq = vi.fn(() => Promise.resolve({ error: null }));
      return c;
    });

    await POST(
      makePost({
        lead_id: LEAD_ID,
        outcome: "converted",
        sale_price_cents: 50000,
        success_fee_cents: 2500,
      })
    );

    expect(updatePayload).toMatchObject({
      outcome: "converted",
      sale_price_cents: 50000,
      success_fee_cents: 2500,
    });
  });

  it("does not include sale_price_cents when outcome is not 'converted'", async () => {
    let callCount = 0;
    let updatePayload: unknown;
    mockServerFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.single = vi.fn().mockResolvedValue({
          data: { id: LEAD_ID, professional_id: ADVISOR_ID },
          error: null,
        });
        return c;
      }
      const c: Record<string, unknown> = {};
      c.update = vi.fn((payload: unknown) => {
        updatePayload = payload;
        return c;
      });
      c.eq = vi.fn(() => Promise.resolve({ error: null }));
      return c;
    });

    await POST(
      makePost({ lead_id: LEAD_ID, outcome: "lost", sale_price_cents: 50000 })
    );

    expect(updatePayload).not.toHaveProperty("sale_price_cents");
  });

  it("returns 500 when update fails", async () => {
    let callCount = 0;
    mockServerFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.single = vi.fn().mockResolvedValue({
          data: { id: LEAD_ID, professional_id: ADVISOR_ID },
          error: null,
        });
        return c;
      }
      const c: Record<string, unknown> = {};
      c.update = vi.fn(() => c);
      c.eq = vi.fn(() => Promise.resolve({ error: { message: "db error" } }));
      return c;
    });

    const res = await POST(makePost({ lead_id: LEAD_ID, outcome: "contacted" }));
    expect(res.status).toBe(500);
  });

  it("accepts all four valid outcome values", async () => {
    for (const outcome of ["contacted", "converted", "lost", "no_response"]) {
      let callCount = 0;
      mockServerFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const c: Record<string, unknown> = {};
          c.select = vi.fn(() => c);
          c.eq = vi.fn(() => c);
          c.single = vi.fn().mockResolvedValue({
            data: { id: LEAD_ID, professional_id: ADVISOR_ID },
            error: null,
          });
          return c;
        }
        const c: Record<string, unknown> = {};
        c.update = vi.fn(() => c);
        c.eq = vi.fn(() => Promise.resolve({ error: null }));
        return c;
      });

      const res = await POST(makePost({ lead_id: LEAD_ID, outcome }));
      expect(res.status).toBe(200);
    }
  });
});

// ── GET tests (email click handler) ───────────────────────────────────────────

describe("GET /api/lead-outcome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 HTML when action, lead, or token params are missing", async () => {
    const res = await GET(makeGet({}));
    expect(res.status).toBe(400);
    expect(res.headers.get("Content-Type")).toContain("text/html");
  });

  it("returns 400 when action is invalid", async () => {
    const res = await GET(
      makeGet({ action: "dismissed", lead: LEAD_ID, token: LEAD_ID.substring(0, 8) })
    );
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain("Invalid Action");
  });

  it("returns 403 when token doesn't match lead ID prefix", async () => {
    const res = await GET(
      makeGet({ action: "contacted", lead: LEAD_ID, token: "ffffffff" })
    );
    expect(res.status).toBe(403);
    const text = await res.text();
    expect(text).toContain("Invalid Link");
  });

  it("returns 404 HTML when lead not found", async () => {
    const c: Record<string, unknown> = {};
    c.select = vi.fn(() => c);
    c.eq = vi.fn(() => c);
    c.single = vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } });
    mockServerFrom.mockReturnValue(c);

    const res = await GET(
      makeGet({ action: "contacted", lead: LEAD_ID, token: LEAD_ID.substring(0, 8) })
    );
    expect(res.status).toBe(404);
    const text = await res.text();
    expect(text).toContain("Lead Not Found");
  });

  it("returns 200 HTML on successful one-click update", async () => {
    let callCount = 0;
    mockServerFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.single = vi.fn().mockResolvedValue({
          data: { id: LEAD_ID, user_name: "Alice Smith", outcome: null },
          error: null,
        });
        return c;
      }
      const c: Record<string, unknown> = {};
      c.update = vi.fn(() => c);
      c.eq = vi.fn(() => Promise.resolve({ error: null }));
      return c;
    });

    const res = await GET(
      makeGet({ action: "contacted", lead: LEAD_ID, token: LEAD_ID.substring(0, 8) })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");
    const text = await res.text();
    expect(text).toContain("Lead Updated");
    expect(text).toContain("Contacted");
    expect(text).toContain("Alice Smith");
  });

  it("shows previous outcome when already set", async () => {
    let callCount = 0;
    mockServerFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.single = vi.fn().mockResolvedValue({
          data: { id: LEAD_ID, user_name: "Bob", outcome: "contacted" },
          error: null,
        });
        return c;
      }
      const c: Record<string, unknown> = {};
      c.update = vi.fn(() => c);
      c.eq = vi.fn(() => Promise.resolve({ error: null }));
      return c;
    });

    const res = await GET(
      makeGet({ action: "converted", lead: LEAD_ID, token: LEAD_ID.substring(0, 8) })
    );
    const text = await res.text();
    expect(text).toContain("Previous status");
    expect(text).toContain("contacted");
  });

  it("handles all three valid GET action values", async () => {
    for (const action of ["contacted", "converted", "lost"]) {
      let callCount = 0;
      mockServerFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const c: Record<string, unknown> = {};
          c.select = vi.fn(() => c);
          c.eq = vi.fn(() => c);
          c.single = vi.fn().mockResolvedValue({
            data: { id: LEAD_ID, user_name: "Test", outcome: null },
            error: null,
          });
          return c;
        }
        const c: Record<string, unknown> = {};
        c.update = vi.fn(() => c);
        c.eq = vi.fn(() => Promise.resolve({ error: null }));
        return c;
      });

      const res = await GET(
        makeGet({ action, lead: LEAD_ID, token: LEAD_ID.substring(0, 8) })
      );
      expect(res.status).toBe(200);
    }
  });
});
