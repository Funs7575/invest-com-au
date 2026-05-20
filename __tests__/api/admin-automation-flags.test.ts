import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/feature-flags", () => ({
  invalidateFlagCache: vi.fn(),
  isFlagEnabled: vi.fn(async () => true),
}));

function makeBuilder(result: unknown = { data: [], error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, POST, PATCH } from "@/app/api/admin/automation/flags/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/automation/flags", {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/admin/automation/flags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true, email: "admin@invest.com.au", userId: "u1" });
  });

  it("GET denies non-admin (401)", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns flag rows", async () => {
    const builder = makeBuilder({ data: [{ id: 1, flag_key: "ai_generation", enabled: true }], error: null });
    mockFrom.mockReturnValue(builder);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("rows");
  });

  it("POST denies non-admin (401)", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq("POST", { flag_key: "test_flag", enabled: true }));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 for missing flag_key", async () => {
    const res = await POST(makeReq("POST", {}));
    expect(res.status).toBe(400);
  });

  it("POST creates flag", async () => {
    const upsertBuilder = makeBuilder({ data: null, error: null });
    const insertBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(upsertBuilder)
      .mockReturnValueOnce(insertBuilder);

    const res = await POST(makeReq("POST", { flag_key: "new_flag", enabled: false }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("PATCH denies non-admin (401)", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await PATCH(makeReq("PATCH", { flag_key: "test_flag", enabled: true }));
    expect(res.status).toBe(401);
  });

  it("PATCH returns 400 for missing flag_key", async () => {
    const res = await PATCH(makeReq("PATCH", {}));
    expect(res.status).toBe(400);
  });

  it("PATCH updates flag", async () => {
    const updateBuilder = makeBuilder({ data: null, error: null });
    const insertBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(updateBuilder)
      .mockReturnValueOnce(insertBuilder);

    const res = await PATCH(makeReq("PATCH", { flag_key: "ai_generation", enabled: false }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
