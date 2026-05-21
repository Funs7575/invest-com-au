import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockRequireAdmin, mockAdminFrom } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockAdminFrom: vi.fn(),
}));

vi.mock("@/lib/require-admin", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn() })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { PATCH } from "@/app/api/admin/startups/[id]/review/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STARTUP_ID = "startup-001";
const STARTUP_NAME = "AcmeTech";

function makeReq(body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/admin/startups/${STARTUP_ID}/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockSelect(row: Record<string, unknown> | null, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error }),
  };
  return chain;
}

function mockUpdate(error: unknown = null) {
  const chain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error }),
  };
  return chain;
}

function mockInsert(error: unknown = null) {
  return { insert: vi.fn().mockResolvedValue({ error }) };
}

function setupAdminFrom(
  startupRow: Record<string, unknown> | null,
  updateError: unknown = null,
) {
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "startup_profiles") {
      return {
        ...mockSelect(startupRow),
        ...mockUpdate(updateError),
      };
    }
    return mockInsert();
  });
}

const draftStartup = { id: STARTUP_ID, company_name: STARTUP_NAME, status: "draft", owner_user_id: "u1" };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue({ ok: true, email: "admin@invest.com.au", response: null });
});

describe("PATCH /api/admin/startups/[id]/review", () => {
  it("returns 401 when not admin", async () => {
    const authFailRes = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    mockRequireAdmin.mockResolvedValue({ ok: false, response: authFailRes });
    const res = await PATCH(makeReq({ action: "approve" }), { params: { id: STARTUP_ID } });
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid action", async () => {
    setupAdminFrom(draftStartup);
    const res = await PATCH(makeReq({ action: "invalid" }), { params: { id: STARTUP_ID } });
    expect(res.status).toBe(400);
    const json = await res.json() as Record<string, unknown>;
    expect(String(json.error)).toMatch(/action must be/);
  });

  it("returns 400 on malformed JSON", async () => {
    setupAdminFrom(draftStartup);
    const req = new NextRequest(`http://localhost/api/admin/startups/${STARTUP_ID}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await PATCH(req, { params: { id: STARTUP_ID } });
    expect(res.status).toBe(400);
  });

  it("returns 404 when startup not found", async () => {
    mockAdminFrom.mockImplementation(() => mockSelect(null));
    const res = await PATCH(makeReq({ action: "approve" }), { params: { id: STARTUP_ID } });
    expect(res.status).toBe(404);
  });

  it("returns 409 when startup is not draft", async () => {
    const activeStartup = { ...draftStartup, status: "active" };
    mockAdminFrom.mockImplementation(() => mockSelect(activeStartup));
    const res = await PATCH(makeReq({ action: "approve" }), { params: { id: STARTUP_ID } });
    expect(res.status).toBe(409);
  });

  it("approves draft startup → status=active", async () => {
    let updatedStatus: string | undefined;
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "startup_profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: draftStartup, error: null }),
          update: vi.fn().mockImplementation((patch: Record<string, unknown>) => {
            updatedStatus = patch.status as string;
            return { eq: vi.fn().mockResolvedValue({ error: null }) };
          }),
        };
      }
      return mockInsert();
    });

    const res = await PATCH(makeReq({ action: "approve" }), { params: { id: STARTUP_ID } });
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.ok).toBe(true);
    expect(json.status).toBe("active");
    expect(updatedStatus).toBe("active");
  });

  it("rejects draft startup → status=rejected", async () => {
    let updatedStatus: string | undefined;
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "startup_profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: draftStartup, error: null }),
          update: vi.fn().mockImplementation((patch: Record<string, unknown>) => {
            updatedStatus = patch.status as string;
            return { eq: vi.fn().mockResolvedValue({ error: null }) };
          }),
        };
      }
      return mockInsert();
    });

    const res = await PATCH(makeReq({ action: "reject", notes: "ABN not verified" }), { params: { id: STARTUP_ID } });
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.status).toBe("rejected");
    expect(updatedStatus).toBe("rejected");
  });

  it("returns 500 when DB update fails", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "startup_profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: draftStartup, error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
          }),
        };
      }
      return mockInsert();
    });
    const res = await PATCH(makeReq({ action: "approve" }), { params: { id: STARTUP_ID } });
    expect(res.status).toBe(500);
  });

  it("logs to admin_audit_log on approve", async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "startup_profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: draftStartup, error: null }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      return { insert: insertSpy };
    });

    await PATCH(makeReq({ action: "approve" }), { params: { id: STARTUP_ID } });
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "startup:approved",
        entity_type: "startup_profile",
        entity_id: STARTUP_ID,
        entity_name: STARTUP_NAME,
        admin_email: "admin@invest.com.au",
      }),
    );
  });
});
