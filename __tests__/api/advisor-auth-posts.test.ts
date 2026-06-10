import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────
// classifyText runs REAL — it's pure and the publish gate is the unit under test.

const { mockRequireAdvisorSession, mockNotifyUser } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn(),
  mockNotifyUser: vi.fn(),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => Promise.resolve(false)),
}));

vi.mock("@/lib/notifications", () => ({
  notifyUser: (...args: unknown[]) => mockNotifyUser(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

import { POST } from "@/app/api/advisor-auth/posts/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

function makeChain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "eq", "limit", "order"]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn(() => Promise.resolve(result));
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  c.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve(result);
  };
  return c;
}

const CLEAN_BODY = {
  body: "Sharing a quick explainer I wrote for clients comparing ETF management fee tiers and what the difference compounds to over a decade.",
  post_type: "insight",
};

const CREATED_POST = { id: 42, professional_id: 7, body: CLEAN_BODY.body, status: "published" };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/posts — publish gate + follower notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(7);
    mockNotifyUser.mockResolvedValue(true);
    // Default success sequence: insert post → follows lookup (none).
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: CREATED_POST, error: null }); // insert
      return makeChain({ data: [], error: null }); // follows
    });
  });

  it("returns 401 when there is no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makePost(CLEAN_BODY));
    expect(res.status).toBe(401);
  });

  it("publishes a clean post (201)", async () => {
    const res = await POST(makePost(CLEAN_BODY));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.post).toMatchObject({ id: 42, status: "published" });
  });

  it("blocks forward-looking return promises with an RG 170 message, persisting nothing", async () => {
    const res = await POST(
      makePost({
        body: "My model portfolio is guaranteed to return 15% next year — get in before it doubles your money.",
        post_type: "insight",
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/forward-looking/i);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("blocks sub-floor throwaway posts with the generic guideline message", async () => {
    const res = await POST(makePost({ body: "hi mate", post_type: "update" }));
    expect(res.status).toBe(400);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("notifies each follower once with a dedup key when the post publishes", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: CREATED_POST, error: null }); // insert
      if (call === 2)
        return makeChain({
          data: [{ follower_user_id: "user-a" }, { follower_user_id: "user-b" }],
          error: null,
        }); // follows
      return makeChain({ data: { name: "Jane Adviser" }, error: null }); // professional
    });

    const res = await POST(makePost(CLEAN_BODY));
    expect(res.status).toBe(201);
    expect(mockNotifyUser).toHaveBeenCalledTimes(2);
    expect(mockNotifyUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-a",
        type: "announcement",
        title: expect.stringContaining("Jane Adviser"),
        emailDeliveryKey: "advisor_post_42",
      }),
    );
  });

  it("does not notify when the advisor has no followers", async () => {
    const res = await POST(makePost(CLEAN_BODY));
    expect(res.status).toBe(201);
    expect(mockNotifyUser).not.toHaveBeenCalled();
  });

  it("still returns 201 when notification fan-out fails", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: CREATED_POST, error: null });
      if (call === 2)
        return makeChain({ data: [{ follower_user_id: "user-a" }], error: null });
      return makeChain({ data: { name: "Jane Adviser" }, error: null });
    });
    mockNotifyUser.mockRejectedValue(new Error("inbox down"));

    const res = await POST(makePost(CLEAN_BODY));
    expect(res.status).toBe(201);
  });
});
