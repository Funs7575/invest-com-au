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

function makeReq(body?: unknown, ip = "1.2.3.4"): NextRequest {
  return new Request("http://localhost/api/org-auth/settings", {
    method: "PATCH",
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
  notification_prefs: {
    new_enrollment: true,
    weekly_summary: false,
    payout_alerts: true,
  },
};

// ── Route under test ──────────────────────────────────────────────────────────
import { PATCH } from "@/app/api/org-auth/settings/route";

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH
// ═══════════════════════════════════════════════════════════════════════════════

describe("PATCH /api/org-auth/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrgSession.mockResolvedValue(SESSION_ADMIN);
  });

  it("returns 401 when requireOrgSession throws a 401 Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 }),
    );
    const res = await PATCH(makeReq({ notification_prefs: { new_enrollment: true } }));
    expect(res.status).toBe(401);
  });

  it("returns 500 when requireOrgSession throws an unexpected Error", async () => {
    mockRequireOrgSession.mockRejectedValue(new Error("unexpected"));
    const res = await PATCH(makeReq({ notification_prefs: { new_enrollment: true } }));
    expect(res.status).toBe(500);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/org-auth/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "not-json{{",
    }) as unknown as NextRequest;
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid json/i);
  });

  it("returns 400 when notification_prefs has an invalid field type", async () => {
    const res = await PATCH(makeReq({ notification_prefs: { new_enrollment: "yes" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("validation_error");
  });

  it("returns 403 when the caller is not an admin", async () => {
    mockRequireOrgSession.mockResolvedValue(SESSION_VIEWER);
    const res = await PATCH(makeReq({ notification_prefs: { new_enrollment: true } }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/Only org admins/i);
  });

  it("returns 200 with no-op message when body has no known settings fields", async () => {
    // SettingsSchema allows empty object — notification_prefs is optional
    const res = await PATCH(makeReq({}));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/No settings to update/i);
  });

  it("returns 500 when the update query fails", async () => {
    mockAdminFrom.mockReturnValue(
      makeChain({ data: null, error: { message: "column missing", hint: "add migration" } }),
    );
    const res = await PATCH(makeReq({ notification_prefs: { new_enrollment: true } }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Failed to update settings/i);
    expect(body.detail).toBe("column missing");
  });

  it("returns 200 with updated org on success (all prefs set)", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: SAMPLE_ORG, error: null }));
    const prefs = { new_enrollment: true, weekly_summary: false, payout_alerts: true };
    const res = await PATCH(makeReq({ notification_prefs: prefs }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.org.notification_prefs.new_enrollment).toBe(true);
    expect(body.org.notification_prefs.weekly_summary).toBe(false);
  });

  it("returns 200 with partial prefs (only weekly_summary provided)", async () => {
    const updatedOrg = { id: 5, notification_prefs: { weekly_summary: true } };
    mockAdminFrom.mockReturnValue(makeChain({ data: updatedOrg, error: null }));
    const res = await PATCH(makeReq({ notification_prefs: { weekly_summary: true } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.org.notification_prefs.weekly_summary).toBe(true);
  });

  it("returns 200 with payout_alerts only pref update", async () => {
    const updatedOrg = { id: 5, notification_prefs: { payout_alerts: false } };
    mockAdminFrom.mockReturnValue(makeChain({ data: updatedOrg, error: null }));
    const res = await PATCH(makeReq({ notification_prefs: { payout_alerts: false } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.org.notification_prefs.payout_alerts).toBe(false);
  });
});
