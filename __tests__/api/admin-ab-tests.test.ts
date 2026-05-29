import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: (..._a: unknown[]) => mockRequireAdmin(),
}));

function makeBuilder(data: unknown = [], error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

const mockFrom = vi.fn((..._a: unknown[]) => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, POST, PATCH } from "@/app/api/admin/ab-tests/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/ab-tests", {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

const adminOk = { ok: true, email: "admin@invest.com.au", userId: "u1" };
const adminDenied = {
  ok: false,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
};
const adminForbidden = {
  ok: false,
  response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
};

const validCreateBody = {
  name: "Hero CTA test",
  test_type: "cta",
  page: "/brokers",
  variant_a: { label: "Open Account" },
  variant_b: { label: "Start Free" },
  traffic_split: 0.5,
};

describe("GET /api/admin/ab-tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(adminOk);
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder([], null));
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue(adminDenied);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin email", async () => {
    mockRequireAdmin.mockResolvedValue(adminForbidden);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns tests list when admin", async () => {
    const tests = [{ id: 1, name: "Hero test", status: "draft" }];
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(tests, null));
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tests).toHaveLength(1);
    expect(json.tests[0].name).toBe("Hero test");
  });

  it("returns empty array when table is empty", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tests).toEqual([]);
  });

  it("returns 500 on DB error", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, { message: "connection lost" }));
    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("connection lost");
  });
});

describe("POST /api/admin/ab-tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(adminOk);
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue(adminDenied);
    const res = await POST(makeReq("POST", validCreateBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/admin/ab-tests", {
      method: "POST",
      body: "not-json{",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid json/i);
  });

  it("returns 400 when required field is missing (name)", async () => {
    const { name: _n, ...noName } = validCreateBody;
    const res = await POST(makeReq("POST", noName));
    expect(res.status).toBe(400);
  });

  it("returns 400 when traffic_split is missing", async () => {
    const { traffic_split: _ts, ...noSplit } = validCreateBody;
    const res = await POST(makeReq("POST", noSplit));
    expect(res.status).toBe(400);
  });

  it("creates a test and returns 200", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await POST(makeReq("POST", validCreateBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("returns 500 on DB insert error", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, { message: "db error" }));
    const res = await POST(makeReq("POST", validCreateBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("db error");
  });
});

describe("PATCH /api/admin/ab-tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(adminOk);
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue(adminDenied);
    const res = await PATCH(makeReq("PATCH", { id: 1, status: "running" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/admin/ab-tests", {
      method: "PATCH",
      body: "bad{",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when id is missing", async () => {
    const res = await PATCH(makeReq("PATCH", { status: "running" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when no update fields provided (only id)", async () => {
    const res = await PATCH(makeReq("PATCH", { id: 1 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("no_updates");
  });

  it("returns 400 when winner is not a or b", async () => {
    const res = await PATCH(makeReq("PATCH", { id: 1, winner: "c" }));
    expect(res.status).toBe(400);
  });

  it("updates status and returns 200", async () => {
    const res = await PATCH(makeReq("PATCH", { id: 1, status: "running" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("updates winner and returns 200", async () => {
    const res = await PATCH(makeReq("PATCH", { id: 1, winner: "a", status: "concluded" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("updates start_date and end_date fields", async () => {
    const res = await PATCH(
      makeReq("PATCH", { id: 2, start_date: "2026-01-01", end_date: "2026-02-01", updated_at: "2026-01-01T00:00:00Z" }),
    );
    expect(res.status).toBe(200);
  });

  it("returns 500 on DB update error", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, { message: "write failed" }));
    const res = await PATCH(makeReq("PATCH", { id: 1, status: "paused" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("write failed");
  });
});
