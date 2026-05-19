import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockGetUser, mockUpsert } = vi.hoisted(() => ({
  mockGetUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(),
  mockUpsert: vi.fn<(payload: unknown, opts?: unknown) => Promise<{ error: { message: string } | null }>>(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({ upsert: mockUpsert })),
  })),
}));

const ORIGINAL_FETCH = globalThis.fetch;

import { GET } from "@/app/api/account/sharesight/callback/route";
import { signState } from "@/lib/sharesight/state";

function makeReq(params: Record<string, string>) {
  const u = new URL("http://localhost/api/account/sharesight/callback");
  for (const [k, v] of Object.entries(params)) {
    u.searchParams.set(k, v);
  }
  return new NextRequest(u.toString());
}

function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

describe("GET /api/account/sharesight/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SHARESIGHT_CLIENT_ID", "client");
    vi.stubEnv("SHARESIGHT_CLIENT_SECRET", "secret");
    vi.stubEnv("SHARESIGHT_OAUTH_STATE_SECRET", "state-secret");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://invest.com.au");
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it("401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeReq({ code: "x", state: "y" }));
    expect(res.status).toBe(401);
  });

  it("redirects with error reason when Sharesight returns ?error= (user declined)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const res = await GET(makeReq({ error: "access_denied" }));
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.pathname).toBe("/account/holdings");
    expect(loc.searchParams.get("sharesight")).toBe("error");
    expect(loc.searchParams.get("reason")).toBe("declined");
  });

  it("redirects with state_bad_signature when state HMAC fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const res = await GET(makeReq({ code: "x", state: "totally.bogus" }));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toMatch(/reason=state_/);
  });

  it("redirects with state_uid_mismatch when state belongs to another user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-real" } } });
    const wrongState = signState("u-other", "state-secret");
    const res = await GET(makeReq({ code: "x", state: wrongState }));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("reason=state_uid_mismatch");
  });

  it("exchanges code, upserts the connection, and redirects connected=true", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockUpsert.mockResolvedValue({ error: null });
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      mockJsonResponse({ access_token: "a", refresh_token: "r", expires_in: 3600 }),
    );
    const state = signState("u1", "state-secret");
    const res = await GET(makeReq({ code: "auth-code", state }));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("sharesight=connected");
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const [payload] = mockUpsert.mock.calls[0]!;
    expect(payload).toMatchObject({
      auth_user_id: "u1",
      access_token: "a",
      refresh_token: "r",
    });
  });

  it("redirects with token_exchange_failed when the token endpoint errors", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(mockJsonResponse({}, 400));
    const state = signState("u1", "state-secret");
    const res = await GET(makeReq({ code: "auth-code", state }));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("reason=token_exchange_failed");
  });
});
