import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

// This route uses createClient (server) for auth, not requireAdmin
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

function makeBuilder(result: unknown = { data: [], error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte",
    "in","is","not","or","order","limit","range","single","maybeSingle","filter",
  ]) b[m] = vi.fn(() => b);
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ADMIN_EMAILS used by this route
vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
  getAdminEmails: () => ["admin@invest.com.au"],
}));

import { GET, POST, DELETE } from "@/app/api/admin/regulatory-impacts/route";

async function makeReq(method: string, body?: unknown, search = ""): Promise<NextRequest> {
  const { NextRequest: NR } = await import("next/server");
  return new NR(`http://localhost/api/admin/regulatory-impacts${search}`, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  });
}

const adminUser = { id: "u1", email: "admin@invest.com.au" };

describe("/api/admin/regulatory-impacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: adminUser }, error: null });
    mockFrom.mockReturnValue(makeBuilder({ data: [], error: null }));
  });

  // GET
  it("GET returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET(await makeReq("GET", undefined, "?alert_id=1"));
    expect(res.status).toBe(401);
  });

  it("GET returns 401 when not admin email", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u2", email: "user@example.com" } },
      error: null,
    });
    const res = await GET(await makeReq("GET", undefined, "?alert_id=1"));
    expect(res.status).toBe(401);
  });

  it("GET returns 400 when alert_id missing", async () => {
    const res = await GET(await makeReq("GET"));
    expect(res.status).toBe(400);
  });

  it("GET returns impacts for valid alert_id", async () => {
    const res = await GET(await makeReq("GET", undefined, "?alert_id=1"));
    expect(res.status).toBe(200);
  });

  // POST
  it("POST returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(
      await makeReq("POST", { alert_id: 1, broker_slug: "abc", impact_level: "low", impact_description: "test" }),
    );
    expect(res.status).toBe(401);
  });

  it("POST returns 400 when required fields missing", async () => {
    const res = await POST(await makeReq("POST", { alert_id: 1 }));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for invalid impact_level", async () => {
    const res = await POST(
      await makeReq("POST", {
        alert_id: 1,
        broker_slug: "test",
        impact_level: "extreme",
        impact_description: "desc",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST upserts impact on happy path", async () => {
    // from() is called 4 times: upsert, select all impacts, update alert, insert audit log
    const upsertBuilder = makeBuilder({
      data: { id: 99, alert_id: 1, broker_slug: "test", impact_level: "low" },
      error: null,
    });
    const slugsBuilder = makeBuilder({
      data: [{ broker_slug: "test" }],
      error: null,
    });
    mockFrom
      .mockReturnValueOnce(upsertBuilder) // regulatory_broker_impacts upsert
      .mockReturnValueOnce(slugsBuilder)  // select broker_slugs
      .mockReturnValue(makeBuilder({ error: null })); // update alert + insert audit log
    const res = await POST(
      await makeReq("POST", {
        alert_id: 1,
        broker_slug: "test",
        impact_level: "low",
        impact_description: "Minor impact",
      }),
    );
    expect(res.status).toBe(200);
  });

  // DELETE
  it("DELETE returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await DELETE(await makeReq("DELETE", undefined, "?id=1"));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 400 when id missing", async () => {
    const res = await DELETE(await makeReq("DELETE"));
    expect(res.status).toBe(400);
  });

  it("DELETE removes impact on happy path", async () => {
    mockFrom.mockReturnValue(makeBuilder({ error: null }));
    const res = await DELETE(await makeReq("DELETE", undefined, "?id=5"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
