import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockRequireOrgSession, mockAdminFrom } = vi.hoisted(() => ({
  mockRequireOrgSession: vi.fn<() => Promise<{ organisationId: number; role: string; userId: string }>>(
    async () => ({ organisationId: 5, role: "admin", userId: "user-org-5" }),
  ),
  mockAdminFrom: vi.fn(() => makeChain()),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/require-org-session", () => ({
  requireOrgSession: () => mockRequireOrgSession(),
}));

vi.mock("@/lib/validation/withValidatedBody", () => ({
  withValidatedBody: (
    schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: { issues: Array<{ message: string }> } } },
    handler: (req: NextRequest, body: unknown) => unknown,
  ) =>
    async (req: NextRequest) => {
      let rawBody: unknown;
      try {
        rawBody = await req.json();
      } catch {
        const { NextResponse } = await import("next/server");
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
      const parsed = schema.safeParse(rawBody);
      if (!parsed.success) {
        const { NextResponse } = await import("next/server");
        const firstMsg = parsed.error?.issues[0]?.message ?? "Validation error";
        return NextResponse.json(
          { error: firstMsg, code: "validation_error", issues: parsed.error?.issues ?? [] },
          { status: 400 },
        );
      }
      return handler(req, parsed.data);
    },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
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

function makeReq(method: string, body?: unknown, ip = "1.2.3.4"): NextRequest {
  return new Request("http://localhost/api/org-auth/profile", {
    method,
    headers: {
      "x-forwarded-for": ip,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }) as unknown as NextRequest;
}

const SESSION_ADMIN = { organisationId: 5, role: "admin", userId: "user-org-5" };
const SESSION_VIEWER = { organisationId: 5, role: "viewer", userId: "user-org-5" };

const SAMPLE_ORG = {
  id: 5,
  name: "Acme Advisors",
  bio: "We help people invest.",
  logo_url: null,
  website: "https://acme.com.au",
  email: "contact@acme.com.au",
  phone: "+61 2 9999 9999",
  location_state: "NSW",
  cpd_provider_number: null,
  abn: "12 345 678 901",
  tier: "starter",
};

// ── Route under test ──────────────────────────────────────────────────────────
import { GET, PATCH } from "@/app/api/org-auth/profile/route";

// ═══════════════════════════════════════════════════════════════════════════════
// GET
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/org-auth/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrgSession.mockResolvedValue(SESSION_ADMIN);
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

  it("returns 404 when org is not found", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "not found" } }));
    const res = await GET();
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/Organisation not found/i);
  });

  it("returns 404 when query returns null data with no error", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await GET();
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/Organisation not found/i);
  });

  it("returns 200 with org on success", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: SAMPLE_ORG, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.org.name).toBe("Acme Advisors");
    expect(body.org.location_state).toBe("NSW");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH
// ═══════════════════════════════════════════════════════════════════════════════

describe("PATCH /api/org-auth/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrgSession.mockResolvedValue(SESSION_ADMIN);
  });

  it("returns 401 when requireOrgSession throws a 401 Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 }),
    );
    const res = await PATCH(makeReq("PATCH", { name: "New Name" }));
    expect(res.status).toBe(401);
  });

  it("returns 500 when requireOrgSession throws an unexpected Error", async () => {
    mockRequireOrgSession.mockRejectedValue(new Error("unexpected crash"));
    const res = await PATCH(makeReq("PATCH", { name: "New Name" }));
    expect(res.status).toBe(500);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/org-auth/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "not-json{{",
    }) as unknown as NextRequest;
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid json/i);
  });

  it("returns 400 when name is too short (Zod min 2)", async () => {
    const res = await PATCH(makeReq("PATCH", { name: "X" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("validation_error");
  });

  it("returns 400 when logo_url is not a valid URL", async () => {
    const res = await PATCH(makeReq("PATCH", { logo_url: "not-a-url" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("validation_error");
  });

  it("returns 400 when website is not a valid URL", async () => {
    const res = await PATCH(makeReq("PATCH", { website: "not-a-url" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("validation_error");
  });

  it("returns 400 when email is invalid", async () => {
    const res = await PATCH(makeReq("PATCH", { email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("validation_error");
  });

  it("returns 400 when location_state is an invalid enum value", async () => {
    const res = await PATCH(makeReq("PATCH", { location_state: "XX" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("validation_error");
  });

  it("returns 403 when the caller is not an admin", async () => {
    mockRequireOrgSession.mockResolvedValue(SESSION_VIEWER);
    const res = await PATCH(makeReq("PATCH", { name: "New Name" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/Only org admins/i);
  });

  it("returns 500 when the update query fails", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "update error" } }));
    const res = await PATCH(makeReq("PATCH", { name: "New Name" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Failed to update profile/i);
  });

  it("returns 500 when update returns null data", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await PATCH(makeReq("PATCH", { name: "New Name" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Failed to update profile/i);
  });

  it("returns 200 with updated org on success", async () => {
    const updatedOrg = { ...SAMPLE_ORG, name: "New Name" };
    mockAdminFrom.mockReturnValue(makeChain({ data: updatedOrg, error: null }));
    const res = await PATCH(makeReq("PATCH", { name: "New Name" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.org.name).toBe("New Name");
  });

  it("returns 200 when patching multiple fields including nullable ones", async () => {
    const updatedOrg = {
      ...SAMPLE_ORG,
      name: "Updated Advisors",
      bio: "Updated bio",
      logo_url: null,
      location_state: "VIC",
    };
    mockAdminFrom.mockReturnValue(makeChain({ data: updatedOrg, error: null }));
    const res = await PATCH(
      makeReq("PATCH", {
        name: "Updated Advisors",
        bio: "Updated bio",
        logo_url: null,
        location_state: "VIC",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.org.location_state).toBe("VIC");
  });

  it("all valid Australian states are accepted", async () => {
    const states = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;
    for (const state of states) {
      vi.clearAllMocks();
      mockRequireOrgSession.mockResolvedValue(SESSION_ADMIN);
      const orgWithState = { ...SAMPLE_ORG, location_state: state };
      mockAdminFrom.mockReturnValue(makeChain({ data: orgWithState, error: null }));
      const res = await PATCH(makeReq("PATCH", { location_state: state }));
      expect(res.status).toBe(200);
    }
  });
});
