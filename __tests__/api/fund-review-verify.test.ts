import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

const mockIsAllowed = vi.hoisted(() => vi.fn<() => Promise<boolean>>().mockResolvedValue(true));
const mockIpKey = vi.hoisted(() => vi.fn().mockReturnValue("127.0.0.1"));
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: mockIpKey,
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { GET } from "@/app/api/fund-review/verify/route";

function makeRequest(token?: string) {
  const url = token
    ? `http://localhost/api/fund-review/verify?token=${token}`
    : "http://localhost/api/fund-review/verify";
  return new NextRequest(url);
}

const CLEAN_REVIEW = {
  id: 1,
  fund_slug: "pengana-fund",
  status: "pending",
  title: "Great fund",
  body: "I have held this fund for five years and the manager has been transparent.",
  pros: "Low fees",
  cons: null,
  display_name: "Alice",
};

const PROFANITY_REVIEW = {
  ...CLEAN_REVIEW,
  body: "This shit fund cost me money over the years",
};

const URL_REVIEW = {
  ...CLEAN_REVIEW,
  body: "Check out https://spam.com for better managed-fund options",
};

const SHORT_REVIEW = {
  ...CLEAN_REVIEW,
  body: "Bad fund",
};

function makeSelectChain(result: { data: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
}

function makeUpdateChain(result: { error: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const m of ["update", "eq"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve(result);
  };
  return chain;
}

describe("GET /api/fund-review/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeRequest("validtoken123456"));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/Too many/i);
  });

  it("redirects with invalid_token when token is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=invalid_token");
  });

  it("redirects with invalid_token when token is too short (<10 chars)", async () => {
    const res = await GET(makeRequest("short"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=invalid_token");
  });

  it("redirects with review_not_found when token lookup fails", async () => {
    mockAdminFrom.mockReturnValue(makeSelectChain({ data: null }));
    const res = await GET(makeRequest("validtoken1234567890"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=review_not_found");
  });

  it("auto-approves a clean review and redirects to fund page", async () => {
    const selectChain = makeSelectChain({ data: CLEAN_REVIEW });
    const updateChain = makeUpdateChain({ error: null });
    mockAdminFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain);
    const res = await GET(makeRequest("cleanvalidtoken1234567890"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    expect(location).toContain("/invest/funds/pengana-fund");
    expect(location).toContain("review_verified=1");
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved" }),
    );
  });

  it("holds profanity review as 'verified' (not auto-approved)", async () => {
    const selectChain = makeSelectChain({ data: PROFANITY_REVIEW });
    const updateChain = makeUpdateChain({ error: null });
    mockAdminFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain);
    await GET(makeRequest("cleanvalidtoken1234567890"));
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "verified" }),
    );
  });

  it("holds review with spam URL as 'verified'", async () => {
    const selectChain = makeSelectChain({ data: URL_REVIEW });
    const updateChain = makeUpdateChain({ error: null });
    mockAdminFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain);
    await GET(makeRequest("cleanvalidtoken1234567890"));
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "verified" }),
    );
  });

  it("holds review with body too short as 'verified'", async () => {
    const selectChain = makeSelectChain({ data: SHORT_REVIEW });
    const updateChain = makeUpdateChain({ error: null });
    mockAdminFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain);
    await GET(makeRequest("cleanvalidtoken1234567890"));
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "verified" }),
    );
  });

  it("skips update and redirects for non-pending review", async () => {
    const alreadyApproved = { ...CLEAN_REVIEW, status: "approved" };
    const selectChain = makeSelectChain({ data: alreadyApproved });
    mockAdminFrom.mockReturnValue(selectChain);
    const res = await GET(makeRequest("cleanvalidtoken1234567890"));
    expect(res.status).toBe(307);
    expect(mockAdminFrom).toHaveBeenCalledTimes(1);
    expect(res.headers.get("location")).toContain("/invest/funds/pengana-fund");
  });

  it("redirects with verification_failed on DB update error", async () => {
    const selectChain = makeSelectChain({ data: CLEAN_REVIEW });
    const updateChain = makeUpdateChain({ error: { message: "DB error" } });
    mockAdminFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain);
    const res = await GET(makeRequest("cleanvalidtoken1234567890"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=verification_failed");
  });

  it("sets moderation_note on auto-held review", async () => {
    const selectChain = makeSelectChain({ data: PROFANITY_REVIEW });
    const updateChain = makeUpdateChain({ error: null });
    mockAdminFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain);
    await GET(makeRequest("cleanvalidtoken1234567890"));
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ moderation_note: expect.stringContaining("Auto-held") }),
    );
  });
});
