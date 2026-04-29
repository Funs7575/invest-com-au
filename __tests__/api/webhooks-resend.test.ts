import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockVerify = vi.fn<[string, string, unknown], boolean>();
vi.mock("@/lib/resend-webhook-verify", () => ({
  extractSvixHeaders: vi.fn(() => ({
    svixId: "msg_123",
    svixTimestamp: "1700000000",
    svixSignature: "v1,abc123",
  })),
  verifyResendSignature: (...args: unknown[]) => mockVerify(...(args as [string, string, unknown])),
}));

import { POST } from "@/app/api/webhooks/resend/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(body: unknown, rawBody?: string): NextRequest {
  const bodyStr = rawBody ?? JSON.stringify(body);
  return new NextRequest("http://localhost/api/webhooks/resend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: bodyStr,
  });
}

function makeUpdateChain() {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/resend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_WEBHOOK_SECRET = "whsec_testsecret";
    mockVerify.mockReturnValue(true);
    mockFrom.mockReturnValue(makeUpdateChain());
  });

  it("returns 500 when RESEND_WEBHOOK_SECRET is not set", async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    const res = await POST(makePost({ type: "email.bounced", data: {} }));
    expect(res.status).toBe(500);
  });

  it("returns 401 when Svix signature verification fails", async () => {
    mockVerify.mockReturnValue(false);
    const res = await POST(makePost({ type: "email.bounced", data: {} }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const res = await POST(makePost(null, "not-json{{{"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when type field is missing", async () => {
    const res = await POST(makePost({ data: { to: ["user@example.com"] } }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when data field is missing", async () => {
    const res = await POST(makePost({ type: "email.bounced" }));
    expect(res.status).toBe(400);
  });

  it("updates all three tables on email.bounced", async () => {
    const called: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      called.push(table);
      return makeUpdateChain();
    });
    const res = await POST(
      makePost({ type: "email.bounced", data: { to: ["bounce@example.com"] } })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    expect(called).toContain("email_captures");
    expect(called).toContain("fee_alert_subscriptions");
    expect(called).toContain("quiz_leads");
  });

  it("updates all three tables on email.complained", async () => {
    const called: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      called.push(table);
      return makeUpdateChain();
    });
    const res = await POST(
      makePost({
        type: "email.complained",
        data: { to: ["spam@example.com"], complaint: { type: "abuse" } },
      })
    );
    expect(res.status).toBe(200);
    expect(called).toContain("email_captures");
  });

  it("does not update tables on email.delivery_delayed", async () => {
    const called: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      called.push(table);
      return makeUpdateChain();
    });
    const res = await POST(
      makePost({ type: "email.delivery_delayed", data: { to: ["user@example.com"] } })
    );
    expect(res.status).toBe(200);
    expect(called).toHaveLength(0);
  });

  it("uses email_id as fallback when to array is absent", async () => {
    let capturedEmail: string | undefined;
    mockFrom.mockImplementation(() => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation((_field: string, val: string) => {
        capturedEmail = val;
        return Promise.resolve({ error: null });
      }),
    }));
    await POST(
      makePost({
        type: "email.bounced",
        data: { email_id: "email_abc@bounce.com" },
      })
    );
    // email_id used as fallback — lower-cased
    expect(capturedEmail).toBe("email_abc@bounce.com");
  });

  it("returns 500 when DB update throws", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("DB error");
    });
    const res = await POST(
      makePost({ type: "email.bounced", data: { to: ["user@example.com"] } })
    );
    expect(res.status).toBe(500);
  });
});
