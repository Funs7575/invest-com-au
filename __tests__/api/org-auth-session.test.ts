import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockRequireOrgSession, mockGetOrgSession, mockAdminFrom, mockSignOut } = vi.hoisted(() => ({
  mockRequireOrgSession: vi.fn<() => Promise<{ organisationId: number; role: string; userId: string }>>(
    async () => ({ organisationId: 7, role: "admin", userId: "user-org-1" }),
  ),
  mockGetOrgSession: vi.fn<() => Promise<unknown>>(async () => ({
    organisationId: 7, role: "admin", userId: "user-org-1",
  })),
  mockAdminFrom: vi.fn(() => makeChain()),
  mockSignOut: vi.fn(async () => ({ error: null })),
}));

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/require-org-session", () => ({
  requireOrgSession: mockRequireOrgSession,
  getOrgSession: mockGetOrgSession,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { signOut: mockSignOut } })),
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

// ── Route under test ──────────────────────────────────────────────────────────

import { GET, DELETE } from "@/app/api/org-auth/session/route";

describe("GET /api/org-auth/session", () => {
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

  it("returns 404 when org row not found", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "no row" } }));
    const res = await GET();
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Organisation not found");
  });

  it("returns 200 with org and role on success", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.org).toMatchObject({ id: 7, name: "Acme" });
    expect(json.role).toBe("admin");
  });
});

describe("DELETE /api/org-auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrgSession.mockResolvedValue({ organisationId: 7, role: "admin", userId: "user-org-1" });
    mockSignOut.mockResolvedValue({ error: null });
  });

  it("signs out and returns success", async () => {
    const res = await DELETE();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("returns success even when sign-out throws", async () => {
    mockSignOut.mockRejectedValue(new Error("network"));
    const res = await DELETE();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
