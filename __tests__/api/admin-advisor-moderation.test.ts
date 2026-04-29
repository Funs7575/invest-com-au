import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@test.com"],
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { PATCH } from "@/app/api/admin/advisor-moderation/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePatch(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/advisor-moderation", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupAuth(email: string | null = "admin@test.com") {
  mockGetUser.mockResolvedValue({
    data: { user: email ? { email } : null },
    error: email ? null : { message: "Unauthorized" },
  });
}

function setupFromMock(updateError: { message: string } | null = null) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "professionals") {
      return {
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ error: updateError }),
      };
    }
    if (table === "admin_audit_log") {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    return {};
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("PATCH /api/admin/advisor-moderation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    setupAuth(null);
    const res = await PATCH(makePatch({ ids: [1], action: "approve" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when user is not in ADMIN_EMAILS", async () => {
    setupAuth("notadmin@test.com");
    const res = await PATCH(makePatch({ ids: [1], action: "approve" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when ids is missing", async () => {
    setupAuth();
    const res = await PATCH(makePatch({ action: "approve" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing or empty ids/);
  });

  it("returns 400 when ids is empty array", async () => {
    setupAuth();
    const res = await PATCH(makePatch({ ids: [], action: "approve" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when action is invalid", async () => {
    setupAuth();
    const res = await PATCH(makePatch({ ids: [1, 2], action: "ban" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/approve.*reject/i);
  });

  it("returns 200 on successful approve", async () => {
    setupAuth();
    setupFromMock();
    const res = await PATCH(makePatch({ ids: [10, 11], action: "approve" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toMatch(/approved/);
  });

  it("returns 200 on successful reject", async () => {
    setupAuth();
    setupFromMock();
    const res = await PATCH(makePatch({ ids: [5], action: "reject" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toMatch(/rejected/);
  });

  it("returns 500 when DB update fails", async () => {
    setupAuth();
    setupFromMock({ message: "connection error" });
    const res = await PATCH(makePatch({ ids: [1], action: "approve" }));
    expect(res.status).toBe(500);
  });

  it("writes audit log on approve", async () => {
    setupAuth();
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "professionals") {
        return { update: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ error: null }) };
      }
      if (table === "admin_audit_log") {
        return { insert: auditInsert };
      }
      return {};
    });
    await PATCH(makePatch({ ids: [3], action: "approve" }));
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "professional:approved" })
    );
  });

  it("returns 400 on malformed JSON body", async () => {
    setupAuth();
    const req = new NextRequest("http://localhost/api/admin/advisor-moderation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{{",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });
});
