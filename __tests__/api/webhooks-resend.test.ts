import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockVerify = vi.fn<(...args: unknown[]) => boolean>();
const mockExtract = vi.fn();

vi.mock("@/lib/resend-webhook-verify", () => ({
  verifyResendSignature: (...args: unknown[]) => mockVerify(...args),
  extractSvixHeaders: (...args: unknown[]) => mockExtract(...args),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { POST } from "@/app/api/webhooks/resend/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const SVIX_HEADERS = {
  svixId: "msg_001",
  svixTimestamp: "1700000000",
  svixSignature: "v1,abc123",
};

function makePost(body: unknown, extraHeaders: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/webhooks/resend", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "svix-id": SVIX_HEADERS.svixId,
      "svix-timestamp": SVIX_HEADERS.svixTimestamp,
      "svix-signature": SVIX_HEADERS.svixSignature,
      ...extraHeaders,
    },
  });
}

function makeUpdateChain(result = { error: null }) {
  const c: Record<string, unknown> = {};
  c.update = vi.fn(() => c);
  c.eq = vi.fn().mockResolvedValue(result);
  return c;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/resend", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...OLD_ENV, RESEND_WEBHOOK_SECRET: "whsec_testsecret" };
    mockExtract.mockReturnValue(SVIX_HEADERS);
    mockVerify.mockReturnValue(true);
    mockAdminFrom.mockReturnValue(makeUpdateChain());
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("returns 500 when RESEND_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    const res = await POST(makePost({ type: "email.bounced", data: {} }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/not configured/i);
  });

  it("returns 401 when signature verification fails", async () => {
    mockVerify.mockReturnValue(false);
    const res = await POST(makePost({ type: "email.bounced", data: {} }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/webhooks/resend", {
      method: "POST",
      body: "not-json",
      headers: {
        "svix-id": SVIX_HEADERS.svixId,
        "svix-timestamp": SVIX_HEADERS.svixTimestamp,
        "svix-signature": SVIX_HEADERS.svixSignature,
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when type or data is missing", async () => {
    const res = await POST(makePost({ type: "email.bounced" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid webhook payload/i);
  });

  it("marks email as bounced in email_captures, fee_alert_subscriptions, quiz_leads on email.bounced", async () => {
    const mockChain = makeUpdateChain();
    mockAdminFrom.mockReturnValue(mockChain);

    const res = await POST(
      makePost({
        type: "email.bounced",
        data: { to: ["user@example.com"], bounce: { message: "user unknown" } },
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    // from() should be called 3 times: email_captures, fee_alert_subscriptions, quiz_leads
    expect(mockAdminFrom).toHaveBeenCalledWith("email_captures");
    expect(mockAdminFrom).toHaveBeenCalledWith("fee_alert_subscriptions");
    expect(mockAdminFrom).toHaveBeenCalledWith("quiz_leads");
  });

  it("handles email.complained event the same way", async () => {
    const res = await POST(
      makePost({
        type: "email.complained",
        data: { to: ["spammer@test.com"], complaint: { type: "abuse" } },
      })
    );
    expect(res.status).toBe(200);
    expect(mockAdminFrom).toHaveBeenCalledWith("email_captures");
  });

  it("uses email_id as fallback when to[] is absent", async () => {
    const res = await POST(
      makePost({
        type: "email.bounced",
        data: { email_id: "norecipient@test.com" },
      })
    );
    expect(res.status).toBe(200);
    expect(mockAdminFrom).toHaveBeenCalledWith("email_captures");
  });

  it("handles email.delivery_delayed without DB writes", async () => {
    const res = await POST(
      makePost({ type: "email.delivery_delayed", data: { to: ["delayed@test.com"] } })
    );
    expect(res.status).toBe(200);
    // No DB update for delivery_delayed
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 200 received:true for unknown event types", async () => {
    const res = await POST(
      makePost({ type: "email.opened", data: { to: ["reader@test.com"] } })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it("normalises email address to lowercase before DB update", async () => {
    const mockChain = makeUpdateChain();
    mockAdminFrom.mockReturnValue(mockChain);

    await POST(
      makePost({ type: "email.bounced", data: { to: ["CAPS@Example.COM"] } })
    );

    // eq() called with lowercased email
    expect(mockChain.eq).toHaveBeenCalledWith("email", "caps@example.com");
  });

  it("returns 500 when DB update throws", async () => {
    const failing = {
      update: vi.fn(() => failing),
      eq: vi.fn().mockRejectedValue(new Error("db error")),
    };
    mockAdminFrom.mockReturnValue(failing);

    const res = await POST(
      makePost({ type: "email.bounced", data: { to: ["err@test.com"] } })
    );
    expect(res.status).toBe(500);
  });
});
