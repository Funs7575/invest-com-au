import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/admin/classifier-config", () => ({ isFeatureDisabled: vi.fn() }));
vi.mock("@/lib/review-sentiment", () => ({
  scoreReview: vi.fn(),
  persistSentiment: vi.fn(),
}));

import { GET } from "@/app/api/cron/review-sentiment-refresh/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";
import { scoreReview, persistSentiment } from "@/lib/review-sentiment";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockIsFeatureDisabled = vi.mocked(isFeatureDisabled);
const mockScoreReview = vi.mocked(scoreReview);
const mockPersistSentiment = vi.mocked(persistSentiment);

function makeTableChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "order", "limit", "update", "insert", "upsert"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain["then"] = vi.fn((resolve: (v: unknown) => void) => Promise.resolve(resolve(result)));
  return chain;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/review-sentiment-refresh", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  mockIsFeatureDisabled.mockResolvedValue(false);
  mockScoreReview.mockResolvedValue({ sentiment: "positive", confidence: 0.9 } as never);
  mockPersistSentiment.mockResolvedValue(undefined);
});

describe("GET /api/cron/review-sentiment-refresh", () => {
  it("returns 401 when cron auth fails", async () => {
    const authResp = new Response(null, { status: 401 });
    mockRequireCronAuth.mockReturnValue(authResp as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns ok:true with skipped when kill switch is on", async () => {
    mockIsFeatureDisabled.mockResolvedValue(true);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe("kill_switch_on");
    expect(mockScoreReview).not.toHaveBeenCalled();
  });

  it("scores reviews not already in seen set", async () => {
    const sentimentChain = makeTableChain({ data: [], error: null }); // no existing
    const brokerChain = makeTableChain({ data: [{ id: 1, body: "Great!", title: null, rating: 5 }], error: null });
    const advisorChain = makeTableChain({ data: [], error: null });
    const fromFn = vi.fn()
      .mockReturnValueOnce(sentimentChain) // review_sentiment_facets
      .mockReturnValueOnce(brokerChain)    // user_reviews
      .mockReturnValueOnce(advisorChain);  // professional_reviews
    mockCreateAdmin.mockReturnValue({ from: fromFn } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.scored).toBe(1);
    expect(mockScoreReview).toHaveBeenCalledOnce();
    expect(mockPersistSentiment).toHaveBeenCalledOnce();
  });

  it("skips reviews already in seen set", async () => {
    const sentimentChain = makeTableChain({
      data: [{ review_type: "user_review", review_id: 1 }],
      error: null,
    });
    const brokerChain = makeTableChain({ data: [{ id: 1, body: "Great!", title: null, rating: 5 }], error: null });
    const advisorChain = makeTableChain({ data: [], error: null });
    const fromFn = vi.fn()
      .mockReturnValueOnce(sentimentChain)
      .mockReturnValueOnce(brokerChain)
      .mockReturnValueOnce(advisorChain);
    mockCreateAdmin.mockReturnValue({ from: fromFn } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.scored).toBe(0);
    expect(mockScoreReview).not.toHaveBeenCalled();
  });

  it("increments failed when scoreReview throws", async () => {
    const sentimentChain = makeTableChain({ data: [], error: null });
    const brokerChain = makeTableChain({ data: [{ id: 2, body: "Hmm", title: null, rating: 3 }], error: null });
    const advisorChain = makeTableChain({ data: [], error: null });
    const fromFn = vi.fn()
      .mockReturnValueOnce(sentimentChain)
      .mockReturnValueOnce(brokerChain)
      .mockReturnValueOnce(advisorChain);
    mockCreateAdmin.mockReturnValue({ from: fromFn } as never);
    mockScoreReview.mockRejectedValue(new Error("AI call failed"));

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.failed).toBe(1);
    expect(body.scored).toBe(0);
  });

  it("scores both broker and advisor reviews", async () => {
    const sentimentChain = makeTableChain({ data: [], error: null });
    const brokerChain = makeTableChain({ data: [{ id: 10, body: "Good", title: null, rating: 4 }], error: null });
    const advisorChain = makeTableChain({ data: [{ id: 20, body: "Great advisor", title: "5 stars", rating: 5 }], error: null });
    const fromFn = vi.fn()
      .mockReturnValueOnce(sentimentChain)
      .mockReturnValueOnce(brokerChain)
      .mockReturnValueOnce(advisorChain);
    mockCreateAdmin.mockReturnValue({ from: fromFn } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.scored).toBe(2);
    expect(mockScoreReview).toHaveBeenCalledTimes(2);
  });
});
