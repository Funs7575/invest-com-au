import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock state ─────────────────────────────────────────────────────────────────

const mockServerFrom = vi.fn();
const mockGetUser = vi.fn();
const mockAdminFrom = vi.fn();
const mockSendReviewRequest = vi.fn((..._args: unknown[]) =>
  Promise.resolve(true),
);

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockServerFrom,
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/advisor-emails", () => ({
  sendReviewRequest: (...args: unknown[]) => mockSendReviewRequest(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn() })),
}));

// ── Import after mocks ─────────────────────────────────────────────────────────

import { POST as verifyPOST } from "@/app/api/advisor-auth/verify/route";
import { POST as requestReviewPOST } from "@/app/api/advisor-auth/request-review/route";

// ── Fixtures ───────────────────────────────────────────────────────────────────

const FUTURE = new Date(Date.now() + 3_600_000).toISOString();
const PAST = new Date(Date.now() - 3_600_000).toISOString();

const AUTH_TOKEN = {
  id: 1,
  professional_id: 10,
  expires_at: FUTURE,
  used_at: null,
};
const ADVISOR = {
  id: 10,
  name: "Dave",
  slug: "dave-advisor",
  firm_name: "Dave & Co",
  email: "dave@inv.com",
  photo_url: null,
};
const LEAD = {
  id: 20,
  user_name: "Eve",
  user_email: "eve@example.com",
  status: "converted",
  review_requested_at: null,
};

function chain(result: { data: unknown; error?: unknown }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "insert", "update", "delete", "eq", "or", "in", "order", "limit"])
    c[m] = vi.fn(() => c);
  c.single = vi.fn(() => Promise.resolve({ data: result.data, error: result.error ?? null }));
  c.maybeSingle = vi.fn(() => Promise.resolve({ data: result.data, error: result.error ?? null }));
  c.then = vi.fn((cb: (v: unknown) => void) => {
    cb({ data: null, error: null });
    return Promise.resolve();
  });
  return c;
}

function verifyPost(body: unknown): Promise<Response> {
  return verifyPOST(
    new NextRequest("http://localhost/api/advisor-auth/verify", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function reviewPost(body: unknown, sessionCookie?: string): Promise<Response> {
  return requestReviewPOST(
    new NextRequest("http://localhost/api/advisor-auth/request-review", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        ...(sessionCookie ? { Cookie: `advisor_session=${sessionCookie}` } : {}),
      },
    }),
  );
}

// ── POST /api/advisor-auth/verify ─────────────────────────────────────────────

describe("POST /api/advisor-auth/verify", () => {
  beforeEach(() => vi.clearAllMocks());

  it("400 — token missing from body", async () => {
    const res = await verifyPost({});
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Token required" });
  });

  it("401 — token not found in advisor_auth_tokens", async () => {
    mockServerFrom.mockReturnValueOnce(chain({ data: null }));
    const res = await verifyPost({ token: "bad-token" });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Invalid or expired link" });
  });

  it("401 — token already used", async () => {
    mockServerFrom.mockReturnValueOnce(
      chain({ data: { ...AUTH_TOKEN, used_at: PAST } }),
    );
    const res = await verifyPost({ token: "used-token" });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "This link has already been used" });
  });

  it("401 — token is expired (expires_at in the past)", async () => {
    mockServerFrom.mockReturnValueOnce(
      chain({ data: { ...AUTH_TOKEN, expires_at: PAST } }),
    );
    const res = await verifyPost({ token: "expired-token" });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: /expired/ });
  });

  it("200 — success: marks token used, creates session, sets HttpOnly cookie", async () => {
    mockServerFrom
      .mockReturnValueOnce(chain({ data: AUTH_TOKEN })) // token lookup
      .mockReturnValueOnce(chain({ data: null })) // update used_at
      .mockReturnValueOnce(chain({ data: null })) // insert session
      .mockReturnValueOnce(chain({ data: ADVISOR })); // advisor info
    const res = await verifyPost({ token: "valid-tok" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ success: true, advisor: expect.objectContaining({ id: 10 }) });
    // Session cookie must be set
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toMatch(/advisor_session=.+/);
    expect(setCookie).toMatch(/HttpOnly/i);
  });

  it("500 — unhandled error (JSON parse throws)", async () => {
    const req = new NextRequest("http://localhost/api/advisor-auth/verify", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await verifyPOST(req);
    // JSON.parse fail → caught by outer try/catch → 500
    expect(res.status).toBe(500);
  });
});

// ── POST /api/advisor-auth/request-review ─────────────────────────────────────

describe("POST /api/advisor-auth/request-review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no Supabase auth user → fall back to session-cookie path
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it("401 — no valid session", async () => {
    const res = await reviewPost({ leadId: 20 }); // no cookie
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Not authenticated" });
  });

  it("400 — leadId missing from body", async () => {
    mockAdminFrom.mockReturnValueOnce(
      chain({ data: { professional_id: 10, expires_at: FUTURE } }),
    ); // session
    const res = await reviewPost({}, "tok");
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "leadId is required" });
  });

  it("400 — leadId is a string instead of number", async () => {
    mockAdminFrom.mockReturnValueOnce(
      chain({ data: { professional_id: 10, expires_at: FUTURE } }),
    );
    const res = await reviewPost({ leadId: "20" }, "tok");
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "leadId is required" });
  });

  it("404 — lead not found for this advisor", async () => {
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: { professional_id: 10, expires_at: FUTURE } })) // session
      .mockReturnValueOnce(chain({ data: null })); // lead lookup
    const res = await reviewPost({ leadId: 20 }, "tok");
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "Lead not found" });
  });

  it("400 — lead status is not converted", async () => {
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: { professional_id: 10, expires_at: FUTURE } }))
      .mockReturnValueOnce(chain({ data: { ...LEAD, status: "pending" } }));
    const res = await reviewPost({ leadId: 20 }, "tok");
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: /converted/ });
  });

  it("409 — review request already sent", async () => {
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: { professional_id: 10, expires_at: FUTURE } }))
      .mockReturnValueOnce(chain({ data: { ...LEAD, review_requested_at: PAST } }));
    const res = await reviewPost({ leadId: 20 }, "tok");
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: /already sent/ });
  });

  it("500 — email send fails", async () => {
    mockSendReviewRequest.mockResolvedValueOnce(false);
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: { professional_id: 10, expires_at: FUTURE } }))
      .mockReturnValueOnce(chain({ data: LEAD })) // lead
      .mockReturnValueOnce(chain({ data: { name: "Dave", slug: "dave-advisor" } })); // advisor
    const res = await reviewPost({ leadId: 20 }, "tok");
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "Failed to send email" });
  });

  it("200 — success: sends email and stamps review_requested_at", async () => {
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: { professional_id: 10, expires_at: FUTURE } })) // session
      .mockReturnValueOnce(chain({ data: LEAD })) // lead
      .mockReturnValueOnce(chain({ data: { name: "Dave", slug: "dave-advisor" } })) // advisor
      .mockReturnValueOnce(chain({ data: null })); // update review_requested_at
    const res = await reviewPost({ leadId: 20 }, "tok");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true });
    expect(mockSendReviewRequest).toHaveBeenCalledWith(
      LEAD.user_email,
      LEAD.user_name,
      "Dave",
      "dave-advisor",
    );
  });
});
