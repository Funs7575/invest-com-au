import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockSendOutboundWebhook = vi.fn();
const mockSendSlackLeadNotification = vi.fn();
const mockAdminMaybeSingle = vi.fn();

vi.mock("@/lib/outbound-webhooks", () => ({
  sendOutboundWebhook: (...args: unknown[]) => mockSendOutboundWebhook(...args),
}));

vi.mock("@/lib/slack-lead-notify", () => ({
  sendSlackLeadNotification: (...args: unknown[]) => mockSendSlackLeadNotification(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: () => mockAdminMaybeSingle(),
    })),
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/internal/lead-webhooks/route";

const INTERNAL_SECRET = "test-internal-secret-xyz";

function req(body: unknown, secret = INTERNAL_SECRET): NextRequest {
  return new NextRequest("http://localhost/api/internal/lead-webhooks", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": secret },
    body: JSON.stringify(body),
  });
}

const validBody = {
  professionalId: 1,
  leadId: 99,
  userName: "Test User",
  userEmail: "test@example.com",
  userPhone: null,
  userState: "NSW",
  need: "financial-advice",
  context: ["super"],
  sourcePage: "/get-matched",
};

describe("POST /api/internal/lead-webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_SECRET = INTERNAL_SECRET;
    mockAdminMaybeSingle.mockResolvedValue({ data: { slack_webhook_url: null }, error: null });
    mockSendOutboundWebhook.mockResolvedValue(undefined);
    mockSendSlackLeadNotification.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.INTERNAL_API_SECRET;
  });

  it("returns 401 when x-internal-secret header is missing", async () => {
    const noSecretReq = new NextRequest("http://localhost/api/internal/lead-webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });
    const res = await POST(noSecretReq);
    expect(res.status).toBe(401);
  });

  it("returns 401 when x-internal-secret is wrong", async () => {
    const res = await POST(req(validBody, "wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON body", async () => {
    const badReq = new NextRequest("http://localhost/api/internal/lead-webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": INTERNAL_SECRET },
      body: "not-json",
    });
    const res = await POST(badReq);
    expect(res.status).toBe(400);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(req({ professionalId: 1 }));
    expect(res.status).toBe(400);
  });

  it("returns 200 and fires outbound webhook", async () => {
    const res = await POST(req(validBody));
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(mockSendOutboundWebhook).toHaveBeenCalledWith(
      "lead.received",
      expect.objectContaining({ professional_id: 1, user_email: "test@example.com" }),
      "professional",
      "1",
    );
  });

  it("does not fire Slack notification when advisor has no webhook URL", async () => {
    mockAdminMaybeSingle.mockResolvedValue({ data: { slack_webhook_url: null }, error: null });
    await POST(req(validBody));
    expect(mockSendSlackLeadNotification).not.toHaveBeenCalled();
  });

  it("fires Slack notification when advisor has a webhook URL configured", async () => {
    mockAdminMaybeSingle.mockResolvedValue({
      data: { slack_webhook_url: "https://hooks.slack.com/services/T123/B456/abc" },
      error: null,
    });
    await POST(req(validBody));
    expect(mockSendSlackLeadNotification).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/T123/B456/abc",
      expect.objectContaining({ userEmail: "test@example.com" }),
    );
  });
});
