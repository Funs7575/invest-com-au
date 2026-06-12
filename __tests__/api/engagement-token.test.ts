import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "test-ip"),
}));

const { mockApplyStatus, mockSubmitAnnual } = vi.hoisted(() => ({
  mockApplyStatus: vi.fn(async () => ({ status: "engaged" }) as { status: string } | null),
  mockSubmitAnnual: vi.fn(
    async () =>
      ({ row: {}, rebriefUrl: null }) as { row: unknown; rebriefUrl: string | null } | null,
  ),
}));
vi.mock("@/lib/briefs/engagements", () => ({
  applyEngagementStatus: mockApplyStatus,
  submitAnnualReview: mockSubmitAnnual,
}));

import { POST } from "@/app/api/engagement/[token]/route";

function makeReq(body: unknown): NextRequest {
  return new Request("http://localhost/api/engagement/tok123", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

function makeCtx(token = "tok_test_1234567890") {
  return { params: Promise.resolve({ token }) };
}

describe("/api/engagement/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockApplyStatus.mockResolvedValue({ status: "engaged" });
    mockSubmitAnnual.mockResolvedValue({ row: {}, rebriefUrl: null });
  });

  it("rate limits", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq({ action: "status", status: "engaged" }), makeCtx());
    expect(res.status).toBe(429);
  });

  it("rejects an invalid status", async () => {
    const res = await POST(makeReq({ action: "status", status: "active" }), makeCtx());
    expect(res.status).toBe(400);
  });

  it("rejects an out-of-range rating", async () => {
    const res = await POST(
      makeReq({ action: "annual_review", rating: 9, fee_band: null, considering_change: false }),
      makeCtx(),
    );
    expect(res.status).toBe(400);
  });

  it("404s on an unknown token", async () => {
    mockApplyStatus.mockResolvedValue(null);
    const res = await POST(makeReq({ action: "status", status: "ended" }), makeCtx());
    expect(res.status).toBe(404);
  });

  it("applies a status", async () => {
    const res = await POST(makeReq({ action: "status", status: "completed" }), makeCtx());
    expect(res.status).toBe(200);
    expect(mockApplyStatus).toHaveBeenCalledWith("tok_test_1234567890", "completed");
  });

  it("submits the annual review and returns the re-brief url", async () => {
    mockSubmitAnnual.mockResolvedValue({ row: {}, rebriefUrl: "/briefs/new?template=tax" });
    const res = await POST(
      makeReq({
        action: "annual_review",
        rating: 2,
        fee_band: "2k_5k",
        considering_change: true,
      }),
      makeCtx(),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rebrief_url).toBe("/briefs/new?template=tax");
  });
});
