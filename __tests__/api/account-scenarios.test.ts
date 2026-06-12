import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// ─── Mocks: flag, rate-limit, supabase server client ──────────────────────────
const { mockIsFlagEnabled, mockIsRateLimited, mockGetUser, mockFrom } =
  vi.hoisted(() => ({
    mockIsFlagEnabled: vi.fn<(...a: unknown[]) => Promise<boolean>>(
      async () => true,
    ),
    mockIsRateLimited: vi.fn<(...a: unknown[]) => Promise<boolean>>(
      async () => false,
    ),
    mockGetUser: vi.fn<(...a: unknown[]) => Promise<unknown>>(async () => ({
      data: { user: { id: "u1", email: "user@example.com" } },
      error: null,
    })),
    mockFrom: vi.fn(),
  }));

vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (...a: unknown[]) => mockIsFlagEnabled(...a),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...a: unknown[]) => mockIsRateLimited(...a),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}));

/**
 * Chainable query-builder mock. `terminals` maps the terminal method name
 * (single / maybeSingle / then) to the resolved value; the count path resolves
 * via the builder being awaited after `.select(... head:true)`.
 */
function makeBuilder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "order",
    "limit",
    "is",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.single = vi.fn(async () => result);
  b.maybeSingle = vi.fn(async () => result);
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

import { GET, POST, PATCH, DELETE } from "@/app/api/account/scenarios/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request("http://localhost/api/account/scenarios", {
    method,
    ...(body !== undefined
      ? {
          body: JSON.stringify(body),
          headers: { "content-type": "application/json" },
        }
      : {}),
  }) as unknown as NextRequest;
}

const VALID_UUID = "a2af6498-d4b2-4bc7-b821-a33d6f6ffacf";

describe("/api/account/scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFlagEnabled.mockResolvedValue(true);
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "user@example.com" } },
      error: null,
    });
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
  });

  // ── Flag gating ──────────────────────────────────────────────────────────────
  it("GET 404s when the scenario_workspace flag is off (fail-closed)", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("POST 404s when the flag is off", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const res = await POST(
      makeReq("POST", {
        calculator_key: "mortgage_calculator",
        name: "X",
        inputs: {},
      }),
    );
    expect(res.status).toBe(404);
  });

  // ── Auth ─────────────────────────────────────────────────────────────────────
  it("GET 401s when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  // ── List ─────────────────────────────────────────────────────────────────────
  it("GET returns the user's scenarios", async () => {
    mockFrom.mockImplementation(() =>
      makeBuilder({
        data: [{ id: VALID_UUID, calculator_key: "mortgage_calculator" }],
        error: null,
      }),
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
  });

  // ── Create + validation ──────────────────────────────────────────────────────
  it("POST 400s on a missing name", async () => {
    const res = await POST(
      makeReq("POST", { calculator_key: "mortgage_calculator", inputs: {} }),
    );
    expect(res.status).toBe(400);
  });

  it("POST 400s on a name longer than 80 chars", async () => {
    const res = await POST(
      makeReq("POST", {
        calculator_key: "mortgage_calculator",
        name: "x".repeat(81),
        inputs: {},
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST creates a scenario and returns 201", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call += 1;
      // 1st call = count (head:true) → { count, error }; 2nd = insert→single.
      if (call === 1) return makeBuilder({ count: 3, error: null });
      return makeBuilder({
        data: { id: VALID_UUID, name: "Aggressive DCA" },
        error: null,
      });
    });
    const res = await POST(
      makeReq("POST", {
        calculator_key: "mortgage_calculator",
        name: "Aggressive DCA",
        inputs: { loan: 500000 },
      }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.item.name).toBe("Aggressive DCA");
  });

  it("POST 409s when the per-user cap (50) is reached", async () => {
    mockFrom.mockImplementation(() =>
      makeBuilder({ count: 50, error: null }),
    );
    const res = await POST(
      makeReq("POST", {
        calculator_key: "mortgage_calculator",
        name: "One too many",
        inputs: {},
      }),
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("scenario_limit_reached");
  });

  it("POST 429s when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(
      makeReq("POST", {
        calculator_key: "mortgage_calculator",
        name: "Rapid",
        inputs: {},
      }),
    );
    expect(res.status).toBe(429);
  });

  // ── Rename ───────────────────────────────────────────────────────────────────
  it("PATCH 400s on a non-uuid id", async () => {
    const res = await PATCH(makeReq("PATCH", { id: "not-a-uuid", name: "New" }));
    expect(res.status).toBe(400);
  });

  it("PATCH renames and returns the updated row", async () => {
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { id: VALID_UUID, name: "Renamed" }, error: null }),
    );
    const res = await PATCH(makeReq("PATCH", { id: VALID_UUID, name: "Renamed" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.item.name).toBe("Renamed");
  });

  it("PATCH 404s when RLS yields no row (not the owner)", async () => {
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: null, error: null }),
    );
    const res = await PATCH(makeReq("PATCH", { id: VALID_UUID, name: "Nope" }));
    expect(res.status).toBe(404);
  });

  it("PATCH 429s when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await PATCH(
      makeReq("PATCH", { id: VALID_UUID, name: "Rapid rename" }),
    );
    expect(res.status).toBe(429);
  });

  // ── Delete ───────────────────────────────────────────────────────────────────
  it("DELETE removes a scenario", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ error: null }));
    const res = await DELETE(makeReq("DELETE", { id: VALID_UUID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("DELETE 429s when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await DELETE(makeReq("DELETE", { id: VALID_UUID }));
    expect(res.status).toBe(429);
  });
});
