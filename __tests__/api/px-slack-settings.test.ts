import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockIsAllowed = vi.fn();
const mockRequireAdvisorSession = vi.fn();
const mockAdminUpdate = vi.fn();

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "ip:1.2.3.4"),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: mockAdminUpdate,
    })),
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { PATCH } from "@/app/api/advisor-portal/slack-settings/route";

function req(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-portal/slack-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/advisor-portal/slack-settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await PATCH(req({ slack_webhook_url: "https://hooks.slack.com/x" }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await PATCH(req({ slack_webhook_url: "https://hooks.slack.com/x" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON body", async () => {
    const badReq = new NextRequest("http://localhost/api/advisor-portal/slack-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await PATCH(badReq);
    expect(res.status).toBe(400);
  });

  it("returns 400 when URL is not a Slack webhook domain", async () => {
    const res = await PATCH(req({ slack_webhook_url: "https://evil.com/webhook" }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/Slack/);
  });

  it("returns 200 with valid Slack webhook URL", async () => {
    const res = await PATCH(req({ slack_webhook_url: "https://hooks.slack.com/services/T123/B456/xyz" }));
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("returns 200 when clearing URL (null)", async () => {
    const res = await PATCH(req({ slack_webhook_url: null }));
    expect(res.status).toBe(200);
  });

  it("returns 500 on DB update error", async () => {
    mockAdminUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
    });
    const res = await PATCH(req({ slack_webhook_url: "https://hooks.slack.com/services/T123" }));
    expect(res.status).toBe(500);
  });
});
