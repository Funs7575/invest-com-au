import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

// createRateLimiter is called at module-init — controlled via vi.hoisted
const rateLimitFn = vi.hoisted(() => vi.fn<() => boolean>(() => false));

vi.mock("@/lib/rate-limiter", () => ({
  createRateLimiter: () => rateLimitFn,
}));

const mockRecordImpression = vi.fn();
vi.mock("@/lib/marketplace/allocation", () => ({
  recordImpression: (...args: unknown[]) => mockRecordImpression(...args),
}));

import { POST } from "@/app/api/marketplace/impression/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(
  body: unknown,
  opts: { ip?: string; ua?: string } = {},
): NextRequest {
  return new NextRequest("http://localhost/api/marketplace/impression", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": opts.ip ?? "10.0.0.1",
      "user-agent": opts.ua ?? "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = { campaign_id: "camp-456", broker_slug: "stake", page: "/brokers", placement: "hero" };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/marketplace/impression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitFn.mockReturnValue(false);
    mockRecordImpression.mockResolvedValue(undefined);
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it("returns 400 when campaign_id is missing", async () => {
    const res = await POST(makePost({ broker_slug: "stake" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/campaign_id/i);
  });

  it("returns 400 when broker_slug is missing", async () => {
    const res = await POST(makePost({ campaign_id: "camp-456" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/broker_slug/i);
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    rateLimitFn.mockReturnValue(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
    expect(mockRecordImpression).not.toHaveBeenCalled();
  });

  // ── Success path ──────────────────────────────────────────────────────────

  it("returns 200 with success=true", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("passes page and placement (as scenario) to recordImpression", async () => {
    await POST(makePost(VALID_BODY));
    expect(mockRecordImpression).toHaveBeenCalledWith(
      "camp-456",
      "stake",
      "/brokers",
      expect.objectContaining({ scenario: "hero" }),
    );
  });

  it("passes undefined page when page not in body", async () => {
    await POST(makePost({ campaign_id: "c1", broker_slug: "stake" }));
    const pageArg = mockRecordImpression.mock.calls[0]?.[2];
    expect(pageArg).toBeUndefined();
  });

  // ── Device type detection ─────────────────────────────────────────────────

  it("detects desktop from default user-agent", async () => {
    await POST(makePost(VALID_BODY, { ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }));
    const ctx = mockRecordImpression.mock.calls[0]?.[3] as { device_type: string };
    expect(ctx.device_type).toBe("desktop");
  });

  it("detects mobile from iPhone user-agent", async () => {
    await POST(
      makePost(VALID_BODY, { ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" }),
    );
    const ctx = mockRecordImpression.mock.calls[0]?.[3] as { device_type: string };
    expect(ctx.device_type).toBe("mobile");
  });

  it("detects tablet from iPad user-agent", async () => {
    await POST(
      makePost(VALID_BODY, { ua: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)" }),
    );
    const ctx = mockRecordImpression.mock.calls[0]?.[3] as { device_type: string };
    expect(ctx.device_type).toBe("tablet");
  });

  // ── Error path ────────────────────────────────────────────────────────────

  it("returns 500 when recordImpression throws", async () => {
    mockRecordImpression.mockRejectedValue(new Error("DB unavailable"));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
  });
});
