/**
 * Tests for /api/account/alerts (GET / POST / DELETE).
 *
 * Covers:
 *   - Auth gate: 401 when not signed in
 *   - POST: valid body creates subscription; invalid body returns 400
 *   - POST: broker_fee requires broker_slug; loan_rate requires lender_slug
 *   - POST: DB error returns 500
 *   - GET: returns items for the current user
 *   - DELETE: removes own subscription; 401 when not signed in
 */

import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}));

// Use mockImplementation (not mockResolvedValue) so the implementation
// survives vi.clearAllMocks(), which only clears call history + queued
// once-returns, not the base implementation set via mockImplementation.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: (...args: unknown[]) => mockFrom(...args),
    }),
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { GET, POST, DELETE } from "@/app/api/account/alerts/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

function makeRequest(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/account/alerts", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const SIGNED_OUT = { data: { user: null } };
const SIGNED_IN = {
  data: { user: { id: "user-123", email: "u@example.com" } },
};

// clearAllMocks clears call history + once-queued returns but preserves
// persistent mockImplementation/mockResolvedValue set in the vi.mock factory.
beforeEach(() => vi.clearAllMocks());

// ── GET ────────────────────────────────────────────────────────────────────────

describe("GET /api/account/alerts", () => {
  it("returns 401 when not signed in", async () => {
    mockGetUser.mockResolvedValueOnce(SIGNED_OUT);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns items for the current user", async () => {
    mockGetUser.mockResolvedValueOnce(SIGNED_IN);
    const items = [
      {
        id: VALID_UUID,
        metric_kind: "savings_rate",
        product_kind: "savings_account",
        threshold_bps: 500,
        direction: "above",
        frequency: "instant",
        broker_slug: null,
        lender_slug: null,
        verified: true,
        last_notified_at: null,
        last_fired_value_bps: null,
        notification_count: 0,
        created_at: "2026-05-01T00:00:00Z",
      },
    ];
    // Build: from().select().eq().order() → resolves
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.order = vi.fn(() => Promise.resolve({ data: items, error: null }));
    mockFrom.mockReturnValueOnce(chain);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[] };
    expect(body.items).toHaveLength(1);
  });

  it("returns 500 when the DB query errors", async () => {
    mockGetUser.mockResolvedValueOnce(SIGNED_IN);
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.order = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: "db_error" } }),
    );
    mockFrom.mockReturnValueOnce(chain);

    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ── POST ───────────────────────────────────────────────────────────────────────

describe("POST /api/account/alerts", () => {
  it("returns 401 when not signed in", async () => {
    mockGetUser.mockResolvedValueOnce(SIGNED_OUT);
    const res = await POST(
      makeRequest("POST", {
        metric_kind: "savings_rate",
        threshold_pct: 5.25,
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing metric_kind", async () => {
    // withValidatedBody returns 400 before the handler runs — no getUser call.
    const res = await POST(makeRequest("POST", { threshold_pct: 5.25 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid metric_kind", async () => {
    // withValidatedBody returns 400 before the handler runs — no getUser call.
    const res = await POST(
      makeRequest("POST", {
        metric_kind: "unknown_kind",
        threshold_pct: 5.25,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for threshold_pct out of range", async () => {
    // withValidatedBody returns 400 before the handler runs — no getUser call.
    const res = await POST(
      makeRequest("POST", {
        metric_kind: "savings_rate",
        threshold_pct: 150,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for broker_fee without broker_slug", async () => {
    mockGetUser.mockResolvedValueOnce(SIGNED_IN);
    const res = await POST(
      makeRequest("POST", { metric_kind: "broker_fee", threshold_pct: 9.99 }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for loan_rate without lender_slug", async () => {
    mockGetUser.mockResolvedValueOnce(SIGNED_IN);
    const res = await POST(
      makeRequest("POST", { metric_kind: "loan_rate", threshold_pct: 6.0 }),
    );
    expect(res.status).toBe(400);
  });

  it("creates a savings_rate alert successfully", async () => {
    mockGetUser.mockResolvedValueOnce(SIGNED_IN);
    const insertedItem = {
      id: VALID_UUID,
      metric_kind: "savings_rate",
      threshold_bps: 525,
      direction: "above",
      frequency: "instant",
    };
    // Chain: from().insert({...}).select("...").single()
    const singleMock = vi.fn(() =>
      Promise.resolve({ data: insertedItem, error: null }),
    );
    const selectMock = vi.fn(() => ({ single: singleMock }));
    const insertMock = vi.fn(() => ({ select: selectMock }));
    mockFrom.mockReturnValueOnce({ insert: insertMock });

    const res = await POST(
      makeRequest("POST", {
        metric_kind: "savings_rate",
        threshold_pct: 5.25,
        direction: "above",
        frequency: "instant",
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { item: { threshold_bps: number } };
    expect(body.item.threshold_bps).toBe(525);
    expect(insertMock).toHaveBeenCalledTimes(1);
    const insertArgs = insertMock.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(insertArgs[0].threshold_bps).toBe(525);
    expect(insertArgs[0].verified).toBe(true);
    expect(insertArgs[0].user_id).toBe("user-123");
  });

  it("creates a broker_fee alert with broker_slug", async () => {
    mockGetUser.mockResolvedValueOnce(SIGNED_IN);
    const singleMock = vi.fn(() =>
      Promise.resolve({
        data: {
          id: VALID_UUID,
          metric_kind: "broker_fee",
          threshold_bps: 999,
          direction: "below",
          frequency: "daily",
        },
        error: null,
      }),
    );
    const selectMock = vi.fn(() => ({ single: singleMock }));
    const insertMock = vi.fn(() => ({ select: selectMock }));
    mockFrom.mockReturnValueOnce({ insert: insertMock });

    const res = await POST(
      makeRequest("POST", {
        metric_kind: "broker_fee",
        threshold_pct: 9.99,
        direction: "below",
        frequency: "daily",
        broker_slug: "commsec",
      }),
    );
    expect(res.status).toBe(201);
    const insertArgs = insertMock.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(insertArgs[0].broker_slug).toBe("commsec");
    expect(insertArgs[0].metric_kind).toBe("broker_fee");
  });

  it("creates a loan_rate alert with lender_slug", async () => {
    mockGetUser.mockResolvedValueOnce(SIGNED_IN);
    const singleMock = vi.fn(() =>
      Promise.resolve({
        data: {
          id: VALID_UUID,
          metric_kind: "loan_rate",
          threshold_bps: 620,
          direction: "below",
          frequency: "instant",
        },
        error: null,
      }),
    );
    const selectMock = vi.fn(() => ({ single: singleMock }));
    const insertMock = vi.fn(() => ({ select: selectMock }));
    mockFrom.mockReturnValueOnce({ insert: insertMock });

    const res = await POST(
      makeRequest("POST", {
        metric_kind: "loan_rate",
        threshold_pct: 6.2,
        direction: "below",
        frequency: "instant",
        lender_slug: "commonwealth-bank",
      }),
    );
    expect(res.status).toBe(201);
    const insertArgs = insertMock.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(insertArgs[0].lender_slug).toBe("commonwealth-bank");
  });

  it("returns 500 when the DB insert fails", async () => {
    mockGetUser.mockResolvedValueOnce(SIGNED_IN);
    const singleMock = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: "db_err" } }),
    );
    const selectMock = vi.fn(() => ({ single: singleMock }));
    const insertMock = vi.fn(() => ({ select: selectMock }));
    mockFrom.mockReturnValueOnce({ insert: insertMock });

    const res = await POST(
      makeRequest("POST", { metric_kind: "savings_rate", threshold_pct: 5.0 }),
    );
    expect(res.status).toBe(500);
  });
});

// ── DELETE ─────────────────────────────────────────────────────────────────────

describe("DELETE /api/account/alerts", () => {
  it("returns 401 when not signed in", async () => {
    mockGetUser.mockResolvedValueOnce(SIGNED_OUT);
    const res = await DELETE(makeRequest("DELETE", { id: VALID_UUID }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing id", async () => {
    // withValidatedBody returns 400 before the handler runs — no getUser call.
    const res = await DELETE(makeRequest("DELETE", {}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-UUID id", async () => {
    // withValidatedBody returns 400 before the handler runs — no getUser call.
    const res = await DELETE(makeRequest("DELETE", { id: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  it("deletes own subscription successfully", async () => {
    mockGetUser.mockResolvedValueOnce(SIGNED_IN);

    // Chain: from().delete().eq(id).eq(user_id) → last eq resolves
    let eqCallCount = 0;
    const chain: Record<string, unknown> = {};
    chain.delete = vi.fn(() => chain);
    chain.eq = vi.fn((..._args: unknown[]) => {
      eqCallCount++;
      if (eqCallCount >= 2) {
        return Promise.resolve({ error: null });
      }
      return chain;
    });
    mockFrom.mockReturnValueOnce(chain);

    const res = await DELETE(makeRequest("DELETE", { id: VALID_UUID }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it("returns 500 when the DB delete fails", async () => {
    mockGetUser.mockResolvedValueOnce(SIGNED_IN);

    let eqCallCount = 0;
    const chain: Record<string, unknown> = {};
    chain.delete = vi.fn(() => chain);
    chain.eq = vi.fn((..._args: unknown[]) => {
      eqCallCount++;
      if (eqCallCount >= 2) {
        return Promise.resolve({ error: { message: "db_err" } });
      }
      return chain;
    });
    mockFrom.mockReturnValueOnce(chain);

    const res = await DELETE(makeRequest("DELETE", { id: VALID_UUID }));
    expect(res.status).toBe(500);
  });
});
