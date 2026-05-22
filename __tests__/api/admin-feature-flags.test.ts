import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

function makeBuilder(result: unknown = { data: [], error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}
const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    rpc: vi.fn(() => makeBuilder()),
  })),
}));

import { GET, PATCH } from "@/app/api/admin/feature-flags/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/feature-flags", {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/admin/feature-flags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      email: "admin@invest.com.au",
      userId: "u1",
    });
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
  });

  // GET
  it("GET denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns items list when admin", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: [{ flag_key: "new_ui" }], error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.items)).toBe(true);
  });

  // PATCH
  it("PATCH denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await PATCH(makeReq("PATCH", { flag_key: "new_ui", enabled: true }));
    expect(res.status).toBe(401);
  });

  it("PATCH returns 400 when flag_key missing", async () => {
    const res = await PATCH(makeReq("PATCH", { enabled: true }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/flag_key/i);
  });

  it("PATCH returns 400 when no update fields provided", async () => {
    const res = await PATCH(makeReq("PATCH", { flag_key: "new_ui" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("no_updates");
  });

  it("PATCH updates flag when valid", async () => {
    const res = await PATCH(makeReq("PATCH", { flag_key: "new_ui", enabled: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("PATCH updates rollout_pct when valid", async () => {
    const res = await PATCH(makeReq("PATCH", { flag_key: "new_ui", rollout_pct: 50 }));
    expect(res.status).toBe(200);
  });

  it("PATCH archives flag when archive=true", async () => {
    const res = await PATCH(makeReq("PATCH", { flag_key: "new_ui", archive: true }));
    expect(res.status).toBe(200);
  });
});
