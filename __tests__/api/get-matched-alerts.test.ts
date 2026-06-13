/**
 * Tests for POST /api/get-matched/alerts (Showcase G9 match-change alerts).
 *
 * Reuses the fee_alert_subscriptions table via the server client. We mock the
 * rate limiter, the upsert, and assert validation + fail-soft behaviour.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { mockIsRateLimited, mockUpsert, serverFrom } = vi.hoisted(() => ({
  mockIsRateLimited: vi.fn(),
  mockUpsert: vi.fn(),
  serverFrom: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: mockIsRateLimited,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: serverFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/get-matched/alerts/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/get-matched/alerts", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
  }) as unknown as NextRequest;
}

const VALID = { email: "alice@example.com", match_slugs: ["stake", "pearler"] };

describe("POST /api/get-matched/alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockUpsert.mockResolvedValue({ error: null });
    serverFrom.mockImplementation(() => ({ upsert: mockUpsert }));
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeReq(VALID));
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/get-matched/alerts", {
      method: "POST",
      body: "!!!",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on a missing / invalid email", async () => {
    expect((await POST(makeReq({ match_slugs: ["stake"] }))).status).toBe(400);
    expect((await POST(makeReq({ email: "not-an-email" }))).status).toBe(400);
  });

  it("subscribes on a valid body and lowercases the email", async () => {
    const res = await POST(makeReq({ ...VALID, email: "Alice@Example.com" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "alice@example.com",
        broker_slugs: ["stake", "pearler"],
        alert_type: "any",
      }),
      expect.objectContaining({ onConflict: "email" }),
    );
  });

  it("accepts an empty match_slugs list", async () => {
    const res = await POST(makeReq({ email: "bob@example.com" }));
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ broker_slugs: [] }),
      expect.anything(),
    );
  });

  it("returns 500 when the upsert errors", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "boom" } });
    const res = await POST(makeReq(VALID));
    expect(res.status).toBe(500);
  });
});
