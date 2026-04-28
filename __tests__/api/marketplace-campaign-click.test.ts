import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

// createRateLimiter is called at module-init — provide a controlled spy via vi.hoisted
const rateLimitFn = vi.hoisted(() => vi.fn<() => boolean>(() => false));

vi.mock("@/lib/rate-limiter", () => ({
  createRateLimiter: () => rateLimitFn,
}));

const mockRecordCpcClick = vi.fn();
vi.mock("@/lib/marketplace/allocation", () => ({
  recordCpcClick: (...args: unknown[]) => mockRecordCpcClick(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

import { POST } from "@/app/api/marketplace/campaign-click/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_BODY = {
  campaign_id: "camp-123",
  broker_slug: "commsec",
  rate_cents: 150,
  click_id: "clk-abc",
  page: "/brokers",
  session_id: "sess-xyz",
};

function makePost(body: unknown, ip = "10.0.0.1"): NextRequest {
  return new NextRequest("http://localhost/api/marketplace/campaign-click", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      "user-agent": "Mozilla/5.0 Test Browser",
    },
    body: JSON.stringify(body),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/marketplace/campaign-click", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitFn.mockReturnValue(false);
    mockRecordCpcClick.mockResolvedValue(true);
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it("returns 400 when campaign_id is missing", async () => {
    const res = await POST(makePost({ ...VALID_BODY, campaign_id: undefined }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/missing/i);
  });

  it("returns 400 when broker_slug is missing", async () => {
    const res = await POST(makePost({ ...VALID_BODY, broker_slug: undefined }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/missing/i);
  });

  it("returns 400 when rate_cents is missing", async () => {
    const res = await POST(makePost({ ...VALID_BODY, rate_cents: undefined }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/missing/i);
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    rateLimitFn.mockReturnValue(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
    expect(mockRecordCpcClick).not.toHaveBeenCalled();
  });

  // ── Insufficient funds ────────────────────────────────────────────────────

  it("returns 402 when recordCpcClick returns false (insufficient funds)", async () => {
    mockRecordCpcClick.mockResolvedValue(false);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.billed).toBe(false);
  });

  // ── Success path ──────────────────────────────────────────────────────────

  it("returns 200 with billed=true on successful click", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.billed).toBe(true);
  });

  it("passes all fields to recordCpcClick", async () => {
    await POST(makePost(VALID_BODY, "203.1.2.3"));
    expect(mockRecordCpcClick).toHaveBeenCalledWith(
      "camp-123",
      "commsec",
      150,
      expect.objectContaining({
        click_id: "clk-abc",
        page: "/brokers",
        session_id: "sess-xyz",
        ip_hash: expect.any(String),
        user_agent: expect.any(String),
      }),
    );
  });

  it("hashes the IP — does not pass the raw IP to recordCpcClick", async () => {
    await POST(makePost(VALID_BODY, "192.168.1.1"));
    const ctx = mockRecordCpcClick.mock.calls[0]?.[3] as { ip_hash: string };
    expect(ctx.ip_hash).not.toContain("192.168.1.1");
    expect(ctx.ip_hash).toHaveLength(16);
  });

  it("truncates user_agent to 500 chars", async () => {
    const longUA = "A".repeat(600);
    const req = new NextRequest("http://localhost/api/marketplace/campaign-click", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.0.1",
        "user-agent": longUA,
      },
      body: JSON.stringify(VALID_BODY),
    });
    await POST(req);
    const ctx = mockRecordCpcClick.mock.calls[0]?.[3] as { user_agent: string };
    expect(ctx.user_agent.length).toBeLessThanOrEqual(500);
  });

  // ── Error path ────────────────────────────────────────────────────────────

  it("returns 500 when recordCpcClick throws", async () => {
    mockRecordCpcClick.mockRejectedValue(new Error("DB down"));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
  });
});
