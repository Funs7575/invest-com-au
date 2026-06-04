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
      (schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown } },
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

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/org-auth/settings", {
    method: "PATCH",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

// ── Route under test ──────────────────────────────────────────────────────────

import { PATCH } from "@/app/api/org-auth/settings/route";

describe("PATCH /api/org-auth/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrgSession.mockResolvedValue({ organisationId: 7, role: "admin", userId: "user-org-1" });
    mockAdminFrom.mockReturnValue(makeChain({ data: { id: 7, notification_prefs: {} }, error: null }));
  });

  it("returns 400 when body fails schema validation (non-boolean pref)", async () => {
    const res = await PATCH(makeReq({ notification_prefs: { new_enrollment: "yes" } }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/org-auth/settings", {
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
    const res = await PATCH(makeReq({ notification_prefs: { new_enrollment: true } }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when caller is not an org admin", async () => {
    mockRequireOrgSession.mockResolvedValue({ organisationId: 7, role: "viewer", userId: "u" });
    const res = await PATCH(makeReq({ notification_prefs: { new_enrollment: true } }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/admins/i);
  });

  it("returns a no-op message when nothing to update", async () => {
    const res = await PATCH(makeReq({}));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBe("No settings to update");
  });

  it("returns 500 with detail when the update fails (e.g. missing column)", async () => {
    mockAdminFrom.mockReturnValue(
      makeChain({ data: null, error: { message: "column does not exist", hint: "add it" } }),
    );
    const res = await PATCH(makeReq({ notification_prefs: { weekly_summary: true } }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Failed to update settings");
    expect(json.detail).toBe("column does not exist");
  });

  it("returns 200 with updated org on success", async () => {
    mockAdminFrom.mockReturnValue(
      makeChain({ data: { id: 7, notification_prefs: { payout_alerts: true } }, error: null }),
    );
    const res = await PATCH(makeReq({ notification_prefs: { payout_alerts: true } }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.org.notification_prefs).toMatchObject({ payout_alerts: true });
  });
});
