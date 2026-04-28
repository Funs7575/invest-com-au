import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

const getWinningCampaignsMock = vi.fn();

vi.mock("@/lib/marketplace/allocation", () => ({
  getWinningCampaigns: (...args: unknown[]) => getWinningCampaignsMock(...args),
}));

import { GET } from "@/app/api/marketplace/allocation/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/marketplace/allocation");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

const SAMPLE_WINNER = { campaign_id: "c1", slug: "commsec", budget_remaining: 500 };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/marketplace/allocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getWinningCampaignsMock.mockResolvedValue([SAMPLE_WINNER]);
  });

  it("returns 400 when placement param is missing", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/placement/i);
  });

  it("returns 200 with placement, winners and ISO timestamp", async () => {
    const res = await GET(makeReq({ placement: "compare-top" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.placement).toBe("compare-top");
    expect(json.winners).toEqual([SAMPLE_WINNER]);
    expect(typeof json.timestamp).toBe("string");
    expect(() => new Date(json.timestamp as string)).not.toThrow();
  });

  it("passes undefined brokerSlugs when brokers param is absent", async () => {
    await GET(makeReq({ placement: "sidebar" }));
    const [, slugs] = getWinningCampaignsMock.mock.calls[0] as [string, unknown, unknown];
    expect(slugs).toBeUndefined();
  });

  it("splits comma-separated brokers into array", async () => {
    await GET(makeReq({ placement: "hero", brokers: "commsec,stake,selfwealth" }));
    const [, slugs] = getWinningCampaignsMock.mock.calls[0] as [string, string[], unknown];
    expect(slugs).toEqual(["commsec", "stake", "selfwealth"]);
  });

  it("filters empty segments from brokers param", async () => {
    await GET(makeReq({ placement: "hero", brokers: "commsec,,stake" }));
    const [, slugs] = getWinningCampaignsMock.mock.calls[0] as [string, string[], unknown];
    expect(slugs).toEqual(["commsec", "stake"]);
  });

  it("passes page and scenario to getWinningCampaigns", async () => {
    await GET(makeReq({ placement: "hero", page: "/brokers/compare", scenario: "ab-test-1" }));
    const [, , ctx] = getWinningCampaignsMock.mock.calls[0] as [
      string,
      unknown,
      { page?: string; scenario?: string },
    ];
    expect(ctx.page).toBe("/brokers/compare");
    expect(ctx.scenario).toBe("ab-test-1");
  });

  it("sets Cache-Control s-maxage=30 and stale-while-revalidate on success", async () => {
    const res = await GET(makeReq({ placement: "top" }));
    const cc = res.headers.get("Cache-Control") ?? "";
    expect(cc).toContain("s-maxage=30");
    expect(cc).toContain("stale-while-revalidate");
  });

  it("returns 500 when getWinningCampaigns throws an Error", async () => {
    getWinningCampaignsMock.mockRejectedValueOnce(new Error("DB connection refused"));
    const res = await GET(makeReq({ placement: "top" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 500 when getWinningCampaigns rejects with a non-Error value", async () => {
    getWinningCampaignsMock.mockRejectedValueOnce("allocation failed");
    const res = await GET(makeReq({ placement: "top" }));
    expect(res.status).toBe(500);
  });
});
