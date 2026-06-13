import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const { mockGetUser, mockServerFrom, mockIsRateLimited, mockPricesBatch } =
  vi.hoisted(() => ({
    mockGetUser:
      vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(),
    mockServerFrom: vi.fn(),
    mockIsRateLimited: vi.fn<() => Promise<boolean>>(),
    mockPricesBatch: vi.fn<() => Promise<Map<string, unknown>>>(),
  }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: mockIsRateLimited,
}));

vi.mock("@/lib/holdings/value", () => ({
  getCurrentPricesBatch: mockPricesBatch,
}));

import { POST } from "@/app/api/account/holdings/import/route";

// ── Helpers ───────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/account/holdings/import", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validInsert = {
  ticker: "BHP",
  exchange: "ASX",
  shares: 100,
  cost_basis_per_share_cents: 4500,
  acquired_at: "2026-03-01",
  broker_slug: "commsec",
  notes: null,
};

/**
 * Build a stub query-builder. `selectResult` answers the `.in()` select of
 * update targets; `insertResult` answers `.insert(...)`; `updateResult`
 * answers `.update(...).eq(...)`. `.update` calls are recorded.
 */
function makeSupabase(opts: {
  selectResult?: { data: unknown; error: unknown };
  insertResult?: { error: unknown; count?: number };
  updateResult?: { error: unknown };
  updateCalls?: Array<Record<string, unknown>>;
}) {
  const selectResult = opts.selectResult ?? { data: [], error: null };
  const insertResult = opts.insertResult ?? { error: null, count: undefined };
  const updateResult = opts.updateResult ?? { error: null };

  mockServerFrom.mockImplementation(() => {
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn(() => builder);
    // `.in(col, ids)` resolves the update-target lookup.
    builder.in = vi.fn(async () => selectResult);
    builder.insert = vi.fn(async (_payload: unknown, _o?: unknown) => insertResult);
    builder.update = vi.fn((payload: Record<string, unknown>) => {
      opts.updateCalls?.push(payload);
      return { eq: vi.fn(async () => updateResult) };
    });
    return builder;
  });
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("POST /api/account/holdings/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockIsRateLimited.mockResolvedValue(false);
    mockPricesBatch.mockResolvedValue(new Map());
    makeSupabase({});
  });

  it("rejects an unauthenticated request with 401", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost({ inserts: [validInsert] }));
    expect(res.status).toBe(401);
  });

  it("rejects an empty payload (Zod superRefine) with 400", async () => {
    const res = await POST(makePost({ inserts: [], updates: [] }));
    expect(res.status).toBe(400);
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await POST(makePost("not json"));
    expect(res.status).toBe(400);
  });

  it("rejects rows that violate the schema (zero shares) with 400", async () => {
    const res = await POST(
      makePost({ inserts: [{ ...validInsert, shares: 0 }] }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate-limited and never touches the DB", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost({ inserts: [validInsert] }));
    expect(res.status).toBe(429);
    expect(mockServerFrom).not.toHaveBeenCalled();
  });

  it("inserts new holdings and warms the price cache", async () => {
    makeSupabase({ insertResult: { error: null, count: 1 } });
    const res = await POST(makePost({ inserts: [validInsert] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ inserted: 1, updated: 0 });
    expect(mockPricesBatch).toHaveBeenCalledOnce();
  });

  it("rejects duplicate update target ids with 400", async () => {
    const res = await POST(
      makePost({
        updates: [
          { id: 5, shares: 10, cost_basis_per_share_cents: 100 },
          { id: 5, shares: 20, cost_basis_per_share_cents: 200 },
        ],
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("duplicate_update_targets");
  });

  it("returns 404 when an update target is not the user's / missing", async () => {
    makeSupabase({ selectResult: { data: [], error: null } }); // no rows owned
    const res = await POST(
      makePost({
        updates: [{ id: 99, shares: 10, cost_basis_per_share_cents: 100 }],
      }),
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("update_target_not_found");
  });

  it("applies an update when the target exists", async () => {
    const updateCalls: Array<Record<string, unknown>> = [];
    makeSupabase({
      selectResult: {
        data: [{ id: 7, shares: 50, cost_basis_per_share_cents: 4000 }],
        error: null,
      },
      updateCalls,
    });
    const res = await POST(
      makePost({
        updates: [{ id: 7, shares: 120, cost_basis_per_share_cents: 4600 }],
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ inserted: 0, updated: 1 });
    expect(updateCalls[0]).toMatchObject({ shares: 120, cost_basis_per_share_cents: 4600 });
  });

  it("is all-or-nothing: a failed insert compensates applied updates", async () => {
    const updateCalls: Array<Record<string, unknown>> = [];
    makeSupabase({
      selectResult: {
        data: [{ id: 7, shares: 50, cost_basis_per_share_cents: 4000 }],
        error: null,
      },
      insertResult: { error: { message: "insert boom" } },
      updateCalls,
    });
    const res = await POST(
      makePost({
        inserts: [validInsert],
        updates: [{ id: 7, shares: 120, cost_basis_per_share_cents: 4600 }],
      }),
    );
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("import_failed");
    // First update applies (120), then compensation restores prior (50).
    expect(updateCalls.map((c) => c.shares)).toEqual([120, 50]);
  });

  it("does not fail the import when the post-insert price warm throws", async () => {
    makeSupabase({ insertResult: { error: null, count: 1 } });
    mockPricesBatch.mockRejectedValue(new Error("prices down"));
    const res = await POST(makePost({ inserts: [validInsert] }));
    expect(res.status).toBe(200);
  });
});
