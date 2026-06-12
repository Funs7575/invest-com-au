/**
 * Tests for POST /api/decision-kit/scorecards — validation, identity scoping,
 * flag gating, and fail-soft (table missing).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const {
  mockIsRateLimited,
  mockIsFlagEnabled,
  mockUpsertScorecard,
  mockAuctionMaybeSingle,
} = vi.hoisted(() => ({
  mockIsRateLimited: vi.fn<(...a: unknown[]) => Promise<boolean>>(async () => false),
  mockIsFlagEnabled: vi.fn<(...a: unknown[]) => Promise<boolean>>(async () => true),
  mockUpsertScorecard: vi.fn<(...a: unknown[]) => Promise<unknown>>(async () => ({
    ok: true,
    saved: true,
  })),
  mockAuctionMaybeSingle: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...a: unknown[]) => mockIsRateLimited(...a),
}));

vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (...a: unknown[]) => mockIsFlagEnabled(...a),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mockAuctionMaybeSingle }) }),
    }),
  })),
}));

// Keep the real scorecards lib (Zod schema imports constants from it) but stub
// the respondents data-layer write so no DB is hit.
vi.mock("@/lib/decision-kit/respondents", async () => {
  const actual = await vi.importActual<typeof import("@/lib/decision-kit/respondents")>(
    "@/lib/decision-kit/respondents",
  );
  return {
    ...actual,
    upsertScorecard: (...a: unknown[]) => mockUpsertScorecard(...a),
  };
});

import { POST } from "@/app/api/decision-kit/scorecards/route";

const VALID_BODY = {
  slug: "my-quote-abc",
  contact_email: "owner@example.com",
  professional_id: 42,
  criteria: { clarity: 4, fee_transparency: 5 },
  notes: "Felt solid.",
};

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/decision-kit/scorecards", {
    method: "POST",
    body: JSON.stringify(body ?? VALID_BODY),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

describe("POST /api/decision-kit/scorecards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockIsFlagEnabled.mockResolvedValue(true);
    mockUpsertScorecard.mockResolvedValue({ ok: true, saved: true });
    mockAuctionMaybeSingle.mockResolvedValue({
      data: { id: 7, contact_email: "owner@example.com" },
      error: null,
    });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeReq());
    expect(res.status).toBe(429);
  });

  it("returns 400 for missing professional_id", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, professional_id: undefined }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an out-of-range rating", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, criteria: { clarity: 9 } }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unknown criterion key (strict schema)", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, criteria: { made_up: 4 } }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, contact_email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/api/decision-kit/scorecards", {
      method: "POST",
      body: "not-json",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when the decision_kit flag is off (fail closed)", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const res = await POST(makeReq());
    expect(res.status).toBe(403);
    expect(mockUpsertScorecard).not.toHaveBeenCalled();
  });

  it("returns 404 when the auction is not found", async () => {
    mockAuctionMaybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await POST(makeReq());
    expect(res.status).toBe(404);
  });

  it("returns 403 when the email does not own the auction (identity scoping)", async () => {
    mockAuctionMaybeSingle.mockResolvedValue({
      data: { id: 7, contact_email: "someone-else@example.com" },
      error: null,
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(403);
    expect(mockUpsertScorecard).not.toHaveBeenCalled();
  });

  it("matches the owner email case-insensitively", async () => {
    mockAuctionMaybeSingle.mockResolvedValue({
      data: { id: 7, contact_email: "Owner@Example.com" },
      error: null,
    });
    const res = await POST(makeReq({ ...VALID_BODY, contact_email: "OWNER@example.COM" }));
    expect(res.status).toBe(200);
  });

  it("returns 503 when the scorecard table is missing (fail soft, no 500)", async () => {
    mockUpsertScorecard.mockResolvedValue({ ok: false, reason: "table_missing" });
    const res = await POST(makeReq());
    expect(res.status).toBe(503);
  });

  it("returns 500 on a generic write failure", async () => {
    mockUpsertScorecard.mockResolvedValue({ ok: false, reason: "error" });
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns 200 and writes the scorecard scoped to the verified owner", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockUpsertScorecard).toHaveBeenCalledTimes(1);
    const arg = mockUpsertScorecard.mock.calls[0]![0] as Record<string, unknown>;
    expect(arg.ownerKey).toBe("owner@example.com");
    expect(arg.briefId).toBe(7);
    expect(arg.professionalId).toBe(42);
  });
});
