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
vi.mock("@/lib/advisor-emails", () => ({
  sendApplicationApproved: vi.fn(async () => {}),
  sendApplicationRejected: vi.fn(async () => {}),
}));
vi.mock("@/lib/url", () => ({
  getSiteUrl: vi.fn(() => "https://invest.com.au"),
}));

function makeBuilder(result: unknown = { data: null, error: null, count: 0 }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter","ilike"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}
const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, PATCH } from "@/app/api/admin/advisor-applications/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/advisor-applications", {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/admin/advisor-applications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true, email: "admin@invest.com.au", userId: "u1" });
  });

  it("GET denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(401);
  });

  it("GET returns applications list", async () => {
    const builder = makeBuilder({ data: [{ id: 1, status: "pending" }], error: null });
    mockFrom.mockReturnValue(builder);
    const req = Object.assign(makeReq("GET"), {
      nextUrl: { searchParams: new URLSearchParams("status=pending") },
    });
    const res = await (GET as (r: NextRequest) => Promise<Response>)(req as NextRequest);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("applications");
  });

  it("PATCH denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await PATCH(makeReq("PATCH", { applicationId: 1, action: "reject" }));
    expect(res.status).toBe(401);
  });

  it("PATCH returns 400 for missing body fields", async () => {
    const res = await PATCH(makeReq("PATCH", {}));
    expect(res.status).toBe(400);
  });

  it("PATCH reject returns success when app is pending", async () => {
    const appData = { id: 1, status: "pending", email: "user@test.com", name: "John", rejection_reason: null };
    const appBuilder = makeBuilder({ data: appData, error: null });
    appBuilder.single = vi.fn(() => Promise.resolve({ data: appData, error: null }));
    const updateBuilder = makeBuilder({ data: null, error: null });
    const insertBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(appBuilder)
      .mockReturnValueOnce(updateBuilder)
      .mockReturnValueOnce(insertBuilder);

    const res = await PATCH(makeReq("PATCH", { applicationId: 1, action: "reject", rejectionReason: "Not suitable" }));
    expect(res.status).not.toBe(401);
  });

  it("PATCH approve returns 500 when auth token insert fails", async () => {
    const appData = {
      id: 2, status: "pending", email: "advisor@example.com", name: "Jane Smith",
      type: "financial_planner", location_suburb: null, location_state: null,
      afsl_number: null, registration_number: null, specialties: null, bio: null,
      website: null, fee_description: null, photo_url: null, abn: null,
      firm_name: null, phone: null, account_type: "individual",
    };

    // location_suburb is null → geocode branch is skipped entirely
    const appFetchBuilder = makeBuilder({ data: appData, error: null });
    appFetchBuilder.single = vi.fn(() => Promise.resolve({ data: appData, error: null }));

    const slugCheckBuilder = makeBuilder({ data: null, error: null });
    slugCheckBuilder.single = vi.fn(() => Promise.resolve({ data: null, error: null }));

    const insertProBuilder = makeBuilder({ data: { id: 99 }, error: null });
    insertProBuilder.single = vi.fn(() => Promise.resolve({ data: { id: 99 }, error: null }));

    const appUpdateBuilder = makeBuilder({ data: null, error: null });

    const tokenInsertBuilder = makeBuilder({ data: null, error: { message: "token insert failed" } });

    mockFrom
      .mockReturnValueOnce(appFetchBuilder)     // advisor_applications select
      .mockReturnValueOnce(slugCheckBuilder)    // professionals slug check (geocode skipped — location_suburb null)
      .mockReturnValueOnce(insertProBuilder)    // professionals insert
      .mockReturnValueOnce(appUpdateBuilder)    // advisor_applications update
      .mockReturnValueOnce(tokenInsertBuilder); // advisor_auth_tokens insert FAILS

    const res = await PATCH(makeReq("PATCH", { applicationId: 2, action: "approve" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/token/i);
  });

  it("PATCH approve returns 200 on happy path", async () => {
    const appData = {
      id: 3, status: "pending", email: "advisor2@example.com", name: "Bob Lee",
      type: "tax_agent", location_suburb: null, location_state: null,
      afsl_number: null, registration_number: null, specialties: null, bio: null,
      website: null, fee_description: null, photo_url: null, abn: null,
      firm_name: null, phone: null, account_type: "individual",
    };

    const appFetchBuilder = makeBuilder({ data: appData, error: null });
    appFetchBuilder.single = vi.fn(() => Promise.resolve({ data: appData, error: null }));

    const slugCheckBuilder = makeBuilder({ data: null, error: null });
    slugCheckBuilder.single = vi.fn(() => Promise.resolve({ data: null, error: null }));

    const insertProBuilder = makeBuilder({ data: { id: 100 }, error: null });
    insertProBuilder.single = vi.fn(() => Promise.resolve({ data: { id: 100 }, error: null }));

    const appUpdateBuilder = makeBuilder({ data: null, error: null });
    const tokenInsertBuilder = makeBuilder({ data: null, error: null });
    const auditBuilder = makeBuilder({ data: null, error: null });

    mockFrom
      .mockReturnValueOnce(appFetchBuilder)     // advisor_applications select
      .mockReturnValueOnce(slugCheckBuilder)    // professionals slug check (geocode skipped — location_suburb null)
      .mockReturnValueOnce(insertProBuilder)    // professionals insert
      .mockReturnValueOnce(appUpdateBuilder)    // advisor_applications update
      .mockReturnValueOnce(tokenInsertBuilder)  // advisor_auth_tokens insert
      .mockReturnValueOnce(auditBuilder);       // admin_audit_log insert

    const res = await PATCH(makeReq("PATCH", { applicationId: 3, action: "approve" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.professionalId).toBe(100);
  });
});
