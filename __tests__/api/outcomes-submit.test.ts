import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

const isAllowedMock = vi.fn<() => Promise<boolean>>();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: () => isAllowedMock(),
  ipKey: () => "test-ip",
}));

const submitOutcomeMock = vi.fn();
vi.mock("@/lib/outcomes", () => ({
  submitOutcome: (...a: unknown[]) => submitOutcomeMock(...a),
}));

const settleSuccessChargeMock = vi.fn();
vi.mock("@/lib/briefs/pricing-tier", () => ({
  settleSuccessCharge: (...a: unknown[]) => settleSuccessChargeMock(...a),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { POST } from "@/app/api/outcomes/submit/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_TOKEN = "t".repeat(24);
const VALID_BODY = { token: VALID_TOKEN, outcome: "in_progress" };

function makeReq(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/outcomes/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function outcomeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    brief_id: 55,
    outcome: "in_progress",
    professional_id: null,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/outcomes/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedMock.mockResolvedValue(true);
    submitOutcomeMock.mockResolvedValue(outcomeRow());
    mockAdminFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { accept_credits_cost: 2 }, error: null }),
    }));
    settleSuccessChargeMock.mockResolvedValue({ charged: false, amountCents: 0 });
  });

  it("returns 429 when rate limited", async () => {
    isAllowedMock.mockResolvedValueOnce(false);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(429);
    expect(submitOutcomeMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await POST(makeReq("not-json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid json/i);
  });

  it("returns 400 when the outcome enum is invalid", async () => {
    const res = await POST(makeReq({ token: VALID_TOKEN, outcome: "bogus" }));
    expect(res.status).toBe(400);
    expect(submitOutcomeMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the token is too short", async () => {
    const res = await POST(makeReq({ token: "short", outcome: "completed" }));
    expect(res.status).toBe(400);
    expect(submitOutcomeMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the outcome link is invalid or expired", async () => {
    submitOutcomeMock.mockResolvedValueOnce(null);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/invalid or expired/i);
  });

  it("returns 200 success and forwards the parsed fields", async () => {
    const res = await POST(
      makeReq({
        token: VALID_TOKEN,
        outcome: "completed",
        rating: 5,
        testimonial: "great help",
        show_testimonial: true,
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(submitOutcomeMock).toHaveBeenCalledWith({
      token: VALID_TOKEN,
      outcome: "completed",
      rating: 5,
      testimonial: "great help",
      showTestimonial: true,
    });
  });

  it("still returns 200 even when no professional is attached (no settle attempt)", async () => {
    submitOutcomeMock.mockResolvedValueOnce(
      outcomeRow({ outcome: "completed", professional_id: null }),
    );
    const res = await POST(makeReq({ token: VALID_TOKEN, outcome: "completed" }));
    expect(res.status).toBe(200);
    expect(settleSuccessChargeMock).not.toHaveBeenCalled();
  });

  it("returns 500 when submitOutcome throws", async () => {
    submitOutcomeMock.mockRejectedValueOnce(new Error("db error"));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/failed to submit/i);
  });
});
