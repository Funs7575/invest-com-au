import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockRequireOrgSession, mockGetOrgSession, mockAdminFrom, mockSignOut } = vi.hoisted(() => ({
  mockRequireOrgSession: vi.fn<() => Promise<{ organisationId: number; role: string; userId: string }>>(
    async () => ({ organisationId: 5, role: "admin", userId: "user-org-5" }),
  ),
  mockGetOrgSession: vi.fn<() => Promise<{ organisationId: number; role: string; userId: string } | null>>(
    async () => ({ organisationId: 5, role: "admin", userId: "user-org-5" }),
  ),
  mockAdminFrom: vi.fn(() => makeChain()),
  mockSignOut: vi.fn<(..._a: unknown[]) => Promise<void>>(async () => undefined),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/require-org-session", () => ({
  requireOrgSession: () => mockRequireOrgSession(),
  getOrgSession: () => mockGetOrgSession(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChain(res: { data?: unknown; error?: unknown; count?: number | null } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or",
    "order", "limit", "range", "maybeSingle", "single", "like", "head",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(
      resolve({ data: res.data ?? null, error: res.error ?? null, count: res.count ?? null }),
    );
  chain.catch = () => chain;
  return chain;
}

const SESSION = { organisationId: 5, role: "admin", userId: "user-org-5" };

const SAMPLE_ORG = {
  id: 5,
  name: "Acme Advisors",
  tier: "starter",
  status: "active",
};

// ── Route under test ──────────────────────────────────────────────────────────
import { GET, DELETE } from "@/app/api/org-auth/session/route";

// ═══════════════════════════════════════════════════════════════════════════════
// GET
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/org-auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrgSession.mockResolvedValue(SESSION);
  });

  it("returns 401 when requireOrgSession throws a 401 Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 }),
    );
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 500 when requireOrgSession throws an unexpected Error", async () => {
    mockRequireOrgSession.mockRejectedValue(new Error("unexpected"));
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("returns 404 when org row is not found", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "not found" } }));
    const res = await GET();
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/Organisation not found/i);
  });

  it("returns 404 when org query returns null data with no error", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await GET();
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/Organisation not found/i);
  });

  it("returns 200 with org and role on success", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: SAMPLE_ORG, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.org.name).toBe("Acme Advisors");
    expect(body.role).toBe("admin");
  });

  it("returns the correct role for a viewer session", async () => {
    mockRequireOrgSession.mockResolvedValue({ ...SESSION, role: "viewer" });
    mockAdminFrom.mockReturnValue(makeChain({ data: SAMPLE_ORG, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("viewer");
  });

  it("returns the correct role for an editor session", async () => {
    mockRequireOrgSession.mockResolvedValue({ ...SESSION, role: "editor" });
    mockAdminFrom.mockReturnValue(makeChain({ data: SAMPLE_ORG, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("editor");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════════════════════

describe("DELETE /api/org-auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrgSession.mockResolvedValue(SESSION);
    mockSignOut.mockResolvedValue(undefined);
  });

  it("returns 200 with success=true on normal sign-out", async () => {
    const res = await DELETE();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("calls supabase.auth.signOut", async () => {
    await DELETE();
    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it("returns 200 success=true even when signOut throws (defensive)", async () => {
    mockSignOut.mockRejectedValue(new Error("signout failed"));
    const res = await DELETE();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 200 success=true even when getOrgSession returns null (already signed out)", async () => {
    mockGetOrgSession.mockResolvedValue(null);
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });
});
