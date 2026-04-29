import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: () => mockGetUser() } })),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: () => ["admin@test.com"],
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/admin/automation/bulk/route";

const ADMIN_USER = { email: "admin@test.com" };

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/automation/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeAdminChain(count = 3) {
  return {
    update: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: null, error: null, count }),
  };
}

function makeAuditChain() {
  return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
  mockFrom.mockImplementation((table: string) => {
    if (table === "admin_action_log" || table === "admin_audit_log") return makeAuditChain();
    return makeAdminChain();
  });
});

describe("POST /api/admin/automation/bulk", () => {
  it("returns 401 when no session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeReq({ feature: "listing_scam", targetVerdict: "approved", rowIds: [1] }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when email not in admin list", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: "other@test.com" } } });
    const res = await POST(makeReq({ feature: "listing_scam", targetVerdict: "approved", rowIds: [1] }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makeReq({ feature: "listing_scam" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing/i);
  });

  it("returns 400 when feature is not bulk-actionable (lead_disputes)", async () => {
    const res = await POST(makeReq({ feature: "lead_disputes", targetVerdict: "approved", rowIds: [1] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/not bulk-actionable/i);
  });

  it("returns 400 when rowIds exceeds MAX_BULK_ROWS (500)", async () => {
    const rowIds = Array.from({ length: 501 }, (_, i) => i + 1);
    const res = await POST(makeReq({ feature: "listing_scam", targetVerdict: "approved", rowIds }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/exceeds/i);
  });

  it("returns 200 with updated count on success", async () => {
    const res = await POST(makeReq({ feature: "listing_scam", targetVerdict: "approved", rowIds: [1, 2, 3] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.updated).toBe(3);
    expect(body.failed).toBe(0);
    expect(body.errors).toHaveLength(0);
  });

  it("routes text_moderation to professional_reviews table when subSurface=advisor_review", async () => {
    const updateCalls: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      if (table === "admin_action_log" || table === "admin_audit_log") return makeAuditChain();
      updateCalls.push(table);
      return makeAdminChain(2);
    });
    const res = await POST(makeReq({
      feature: "text_moderation",
      targetVerdict: "approved",
      rowIds: [10, 11],
      subSurface: "advisor_review",
    }));
    expect(res.status).toBe(200);
    expect(updateCalls).toContain("professional_reviews");
  });

  it("returns 200 even when audit log insert fails", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "admin_action_log") {
        return { insert: vi.fn().mockResolvedValue({ data: null, error: { message: "log error" } }) };
      }
      if (table === "admin_audit_log") return makeAuditChain();
      return makeAdminChain();
    });
    const res = await POST(makeReq({ feature: "advisor_applications", targetVerdict: "approved", rowIds: [1] }));
    expect(res.status).toBe(200);
  });
});
