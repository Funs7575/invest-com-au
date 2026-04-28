import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { POST } from "@/app/api/marketplace/notify/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const INTERNAL_KEY = "test-internal-key";

function makeRequest(body?: unknown, key?: string): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key !== undefined) headers["x-internal-key"] = key;
  return new NextRequest("http://localhost/api/marketplace/notify", {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeValidBody(overrides = {}) {
  return {
    broker_slug: "commsec",
    type: "update",
    title: "New fee structure",
    message: "We have updated our fee structure effective next month.",
    ...overrides,
  };
}

function makeInsertBuilder(data: unknown = { id: 42 }, error: unknown = null) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data, error })),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/marketplace/notify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = INTERNAL_KEY;
  });

  afterEach(() => {
    delete process.env.INTERNAL_API_KEY;
    delete process.env.RESEND_API_KEY;
  });

  it("returns 401 when no auth header", async () => {
    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/unauthorized/i);
  });

  it("returns 401 when wrong key", async () => {
    const res = await POST(makeRequest(makeValidBody(), "wrong-key"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    mockAdminFrom.mockReturnValue(makeInsertBuilder());
    const res = await POST(makeRequest({ broker_slug: "commsec" }, INTERNAL_KEY));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/required/i);
  });

  it("returns 200 with notification_id on success", async () => {
    mockAdminFrom.mockReturnValue(makeInsertBuilder({ id: 42 }));
    const res = await POST(makeRequest(makeValidBody(), INTERNAL_KEY));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.notification_id).toBe(42);
  });

  it("inserts into broker_notifications with correct fields", async () => {
    const builder = makeInsertBuilder({ id: 1 });
    mockAdminFrom.mockReturnValue(builder);
    await POST(makeRequest(makeValidBody(), INTERNAL_KEY));
    expect(mockAdminFrom).toHaveBeenCalledWith("broker_notifications");
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        broker_slug: "commsec",
        type: "update",
        title: "New fee structure",
        message: "We have updated our fee structure effective next month.",
        is_read: false,
        email_sent: false,
      }),
    );
  });

  it("returns 500 when insert fails", async () => {
    mockAdminFrom.mockReturnValue(makeInsertBuilder(null, { message: "DB error" }));
    const res = await POST(makeRequest(makeValidBody(), INTERNAL_KEY));
    expect(res.status).toBe(500);
  });

  it("returns 500 on unexpected throw", async () => {
    mockAdminFrom.mockImplementation(() => { throw new Error("crash"); });
    const res = await POST(makeRequest(makeValidBody(), INTERNAL_KEY));
    expect(res.status).toBe(500);
  });
});
