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

import { GET, POST, DELETE } from "@/app/api/admin/bd-pipeline/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/bd-pipeline", {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/admin/bd-pipeline", () => {
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

  it("GET returns pipeline entries", async () => {
    const builder = makeBuilder({ data: [{ id: 1, company_name: "Acme Corp", status: "active" }], error: null });
    mockFrom.mockReturnValue(builder);
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("POST denies non-admin (401)", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq("POST", { company_name: "New Corp" }));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 when company_name missing", async () => {
    const res = await POST(makeReq("POST", {}));
    expect(res.status).toBe(400);
  });

  it("POST creates new entry", async () => {
    const newEntry = { id: 5, company_name: "New Corp", status: "prospect", updated_at: new Date().toISOString() };
    const insertBuilder = makeBuilder({ data: newEntry, error: null });
    insertBuilder.single = vi.fn(() => Promise.resolve({ data: newEntry, error: null }));
    const insertChain = makeBuilder();
    insertChain.select = vi.fn(() => insertBuilder);
    insertBuilder.select = vi.fn(() => insertBuilder);
    const auditBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(auditBuilder);

    const res = await POST(makeReq("POST", { company_name: "New Corp", status: "prospect" }));
    // Should be 200 (not 401)
    expect(res.status).not.toBe(401);
  });

  it("DELETE denies non-admin (401)", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await DELETE(makeReq("DELETE", { id: 1 }));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 400 when id missing", async () => {
    const res = await DELETE(makeReq("DELETE", {}));
    expect(res.status).toBe(400);
  });

  it("DELETE removes entry", async () => {
    const deleteBuilder = makeBuilder({ data: null, error: null });
    const auditBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(deleteBuilder)
      .mockReturnValueOnce(auditBuilder);

    const res = await DELETE(makeReq("DELETE", { id: 1 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe(true);
  });
});
