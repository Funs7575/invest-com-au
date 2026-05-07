import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const { mockAdminFrom, mockRequireAdmin } = vi.hoisted(() => ({
  mockAdminFrom: vi.fn(),
  mockRequireAdmin: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: mockRequireAdmin,
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

import { POST } from "@/app/api/admin/marketplace/campaign-notify/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/marketplace/campaign-notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeValidBody(overrides = {}) {
  return {
    broker_slug: "commsec",
    type: "campaign_approved",
    title: "Campaign Approved",
    message: "Your campaign has been approved.",
    ...overrides,
  };
}

function makeInsertBuilder(data: unknown = { id: 99 }, error: unknown = null) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data, error })),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/admin/marketplace/campaign-notify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true, email: "admin@invest.com.au", userId: "u1" });
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it("returns 401 when requireAdmin denies", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });
    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makeRequest({ broker_slug: "commsec" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/required/i);
  });

  it("returns 200 with notification_id on success", async () => {
    mockAdminFrom.mockReturnValue(makeInsertBuilder({ id: 99 }));
    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.notification_id).toBe(99);
  });

  it("inserts notification with correct fields", async () => {
    const builder = makeInsertBuilder({ id: 1 });
    mockAdminFrom.mockReturnValue(builder);
    await POST(makeRequest(makeValidBody()));
    expect(mockAdminFrom).toHaveBeenCalledWith("broker_notifications");
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        broker_slug: "commsec",
        type: "campaign_approved",
        title: "Campaign Approved",
        is_read: false,
        email_sent: false,
      }),
    );
  });

  it("returns 500 when insert fails", async () => {
    mockAdminFrom.mockReturnValue(makeInsertBuilder(null, { message: "DB error" }));
    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(500);
  });

  it("does not call Resend when send_email is false", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    mockAdminFrom.mockReturnValue(makeInsertBuilder({ id: 1 }));
    await POST(makeRequest(makeValidBody({ send_email: false })));
    // fetch would only be called for Resend if send_email=true + account found
    // With send_email=false, no Resend fetch
    const resendCalls = fetchSpy.mock.calls.filter(([url]) =>
      typeof url === "string" && url.includes("resend.com"),
    );
    expect(resendCalls).toHaveLength(0);
    fetchSpy.mockRestore();
  });

  it("skips email when RESEND_API_KEY is not set", async () => {
    delete process.env.RESEND_API_KEY;
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    mockAdminFrom.mockReturnValue(makeInsertBuilder({ id: 1 }));
    await POST(makeRequest(makeValidBody({ send_email: true })));
    const resendCalls = fetchSpy.mock.calls.filter(([url]) =>
      typeof url === "string" && url.includes("resend.com"),
    );
    expect(resendCalls).toHaveLength(0);
    fetchSpy.mockRestore();
  });
});
