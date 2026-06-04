import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockRequireOrgSession, mockAdminFrom } = vi.hoisted(() => ({
  mockRequireOrgSession: vi.fn<() => Promise<{ organisationId: number; role: string; userId: string }>>(
    async () => ({ organisationId: 7, role: "admin", userId: "user-org-1" }),
  ),
  mockAdminFrom: vi.fn(() => makeChain()),
}));

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/require-org-session", () => ({
  requireOrgSession: mockRequireOrgSession,
}));

// Faithful wrapper: validates with the real schema, returns 400 on failure.
vi.mock("@/lib/validation/withValidatedBody", async () => {
  const { NextResponse } = await import("next/server");
  return {
    withValidatedBody:
      (schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: { issues: unknown[] } } },
       handler: (req: NextRequest, body: unknown) => unknown) =>
      async (req: NextRequest) => {
        let raw: unknown;
        try {
          raw = await req.json();
        } catch {
          return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const parsed = schema.safeParse(raw);
        if (!parsed.success) {
          return NextResponse.json({ error: "validation", code: "validation_error" }, { status: 400 });
        }
        return handler(req, parsed.data);
      },
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeChain(res: { data?: unknown; error?: unknown } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or",
    "order", "limit", "maybeSingle", "single", "like",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null }));
  chain.catch = () => chain;
  return chain;
}

function makeReq(method: string, body?: unknown): NextRequest {
  return new Request("http://localhost/api/org-auth/profile", {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

// ── Route under test ──────────────────────────────────────────────────────────

import { GET, PATCH } from "@/app/api/org-auth/profile/route";

describe("GET /api/org-auth/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrgSession.mockResolvedValue({ organisationId: 7, role: "admin", userId: "user-org-1" });
    mockAdminFrom.mockReturnValue(makeChain({ data: { id: 7, name: "Acme" }, error: null }));
  });

  it("returns 401 when requireOrgSession throws a Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 }),
    );
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 500 when requireOrgSession throws an unexpected Error", async () => {
    mockRequireOrgSession.mockRejectedValue(new Error("boom"));
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("returns 404 when org not found", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "no row" } }));
    const res = await GET();
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Organisation not found");
  });

  it("returns 200 with org on success", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.org).toMatchObject({ id: 7, name: "Acme" });
  });
});

describe("PATCH /api/org-auth/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrgSession.mockResolvedValue({ organisationId: 7, role: "admin", userId: "user-org-1" });
    mockAdminFrom.mockReturnValue(makeChain({ data: { id: 7, name: "New Name" }, error: null }));
  });

  it("returns 400 when body fails schema validation (name too short)", async () => {
    const res = await PATCH(makeReq("PATCH", { name: "x" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/org-auth/profile", {
      method: "PATCH",
      body: "not-json",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 when requireOrgSession throws a Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 }),
    );
    const res = await PATCH(makeReq("PATCH", { name: "Valid Name" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when caller is not an org admin", async () => {
    mockRequireOrgSession.mockResolvedValue({ organisationId: 7, role: "editor", userId: "u" });
    const res = await PATCH(makeReq("PATCH", { name: "Valid Name" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/admins/i);
  });

  it("returns 500 when the update query fails", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "db error" } }));
    const res = await PATCH(makeReq("PATCH", { name: "Valid Name" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Failed to update profile");
  });

  it("returns 200 with updated org on success", async () => {
    const res = await PATCH(makeReq("PATCH", { name: "New Name", bio: "About us", phone: null }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.org).toMatchObject({ id: 7, name: "New Name" });
  });
});
