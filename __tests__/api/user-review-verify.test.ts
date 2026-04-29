import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

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

import { GET } from "@/app/api/user-review/verify/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(token?: string) {
  const url = token
    ? `http://localhost/api/user-review/verify?token=${token}`
    : "http://localhost/api/user-review/verify";
  return new NextRequest(url);
}

// A valid review in 'pending' state
const CLEAN_REVIEW = {
  id: 1,
  broker_slug: "commsec",
  status: "pending",
  title: "Great broker",
  body: "I have been using CommSec for five years and it is reliable.",
  pros: "Low brokerage",
  cons: null,
  display_name: "Alice",
};

// Review with profanity
const PROFANITY_REVIEW = {
  ...CLEAN_REVIEW,
  body: "This shit broker cost me money",
};

// Review with URL (spam)
const URL_REVIEW = {
  ...CLEAN_REVIEW,
  body: "Check out https://spam.com for better deals on trading",
};

// Review with body too short
const SHORT_REVIEW = {
  ...CLEAN_REVIEW,
  body: "Bad broker",
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

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/user-review/verify", () => {
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

  it("auto-approves a clean review and redirects to broker page", async () => {
    const selectChain = makeSelectChain({ data: CLEAN_REVIEW });
    const updateChain = makeUpdateChain({ error: null });
    mockAdminFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain);
    const res = await GET(makeRequest("cleanvalidtoken1234567890"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    expect(location).toContain("/broker/commsec");
    expect(location).toContain("review_verified=1");
    // Confirm auto-approve status was written
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved" })
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
      expect.objectContaining({ status: "verified" })
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
      expect.objectContaining({ status: "verified" })
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
      expect.objectContaining({ status: "verified" })
    );
  });

  it("skips update and redirects for non-pending review", async () => {
    const alreadyApproved = { ...CLEAN_REVIEW, status: "approved" };
    const selectChain = makeSelectChain({ data: alreadyApproved });
    mockAdminFrom.mockReturnValue(selectChain);
    const res = await GET(makeRequest("cleanvalidtoken1234567890"));
    expect(res.status).toBe(307);
    // No second from() call for update
    expect(mockAdminFrom).toHaveBeenCalledTimes(1);
    expect(res.headers.get("location")).toContain("/broker/commsec");
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
      expect.objectContaining({ moderation_note: expect.stringContaining("Auto-held") })
    );
  });
});
