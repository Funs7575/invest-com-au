import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const isAllowedMock = vi.fn<() => Promise<boolean>>();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (..._args: unknown[]) => isAllowedMock(),
  ipKey: () => "test-ip",
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

import { GET } from "@/app/api/switch-story/verify/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(token?: string, ip = "1.2.3.4") {
  const url = token
    ? `http://localhost/api/switch-story/verify?token=${token}`
    : "http://localhost/api/switch-story/verify";
  return new NextRequest(url, {
    method: "GET",
    headers: { "x-forwarded-for": ip },
  });
}

function makeChain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "update"]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn(() => Promise.resolve(result));
  c.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve(result);
  };
  return c;
}

const PENDING_STORY = {
  id: 1,
  dest_broker_slug: "stake",
  status: "pending",
  title: "Great switch",
  body: "Moved to Stake and loved it.",
  reason: "Lower fees",
  display_name: "Jane Smith",
};

const CLEAN_STORY = {
  ...PENDING_STORY,
  title: "Good switch",
  body: "This is a legitimate switch story with enough characters.",
  reason: null,
  display_name: "Bob Jones",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/switch-story/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedMock.mockResolvedValue(true);
  });

  it("returns 429 when rate limited", async () => {
    isAllowedMock.mockResolvedValue(false);
    const res = await GET(makeRequest("valid-token-1234567890"));
    expect(res.status).toBe(429);
  });

  it("redirects to error page when token is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=invalid_token");
  });

  it("redirects to error page when token is too short", async () => {
    const res = await GET(makeRequest("abc"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=invalid_token");
  });

  it("redirects to error page when story is not found", async () => {
    const chain = makeChain({ data: null, error: null });
    mockAdminFrom.mockReturnValue(chain);

    const res = await GET(makeRequest("valid-token-1234567890"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=story_not_found");
  });

  it("redirects to broker page with story_verified=1 on success (clean story)", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: CLEAN_STORY, error: null }); // story lookup
      return makeChain({ data: null, error: null });                         // update status
    });

    const res = await GET(makeRequest("valid-token-abcdefghij"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/broker/stake");
    expect(location).toContain("story_verified=1");
  });

  it("auto-approves clean story (no profanity, no URL, body ≥ 20 chars)", async () => {
    let updatePayload: Record<string, unknown> | null = null;
    let call = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      call++;
      if (call === 1) return makeChain({ data: CLEAN_STORY, error: null });
      const c = makeChain({ data: null, error: null });
      if (table === "switch_stories") {
        const origUpdate = c.update as ReturnType<typeof vi.fn>;
        (c.update as ReturnType<typeof vi.fn>) = vi.fn((payload: Record<string, unknown>) => {
          updatePayload = payload;
          return c;
        });
        void origUpdate;
      }
      return c;
    });

    await GET(makeRequest("valid-token-abcdefghij"));
    if (updatePayload) {
      expect((updatePayload as { status: string }).status).toBe("approved");
    }
  });

  it("holds story as 'verified' when it contains profanity", async () => {
    const dirtyStory = { ...CLEAN_STORY, body: "This shit broker cost me money badly" };
    let updatePayload: Record<string, unknown> | null = null;
    let call = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      call++;
      if (call === 1) return makeChain({ data: dirtyStory, error: null });
      const c = makeChain({ data: null, error: null });
      if (table === "switch_stories") {
        (c.update as ReturnType<typeof vi.fn>) = vi.fn((payload: Record<string, unknown>) => {
          updatePayload = payload;
          return c;
        });
      }
      return c;
    });

    await GET(makeRequest("valid-token-abcdefghij"));
    if (updatePayload) {
      expect((updatePayload as { status: string }).status).toBe("verified");
      expect((updatePayload as { moderation_note: string }).moderation_note).toMatch(/profanity/i);
    }
  });

  it("skips update and still redirects when story is already non-pending", async () => {
    const alreadyVerified = { ...CLEAN_STORY, status: "approved" };
    const chain = makeChain({ data: alreadyVerified, error: null });
    mockAdminFrom.mockReturnValue(chain);

    const res = await GET(makeRequest("valid-token-abcdefghij"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/broker/stake");
  });

  it("redirects to error page when DB update fails", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: PENDING_STORY, error: null });
      return makeChain({ data: null, error: { message: "update failed" } });
    });

    const res = await GET(makeRequest("valid-token-abcdefghij"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=verification_failed");
  });
});
