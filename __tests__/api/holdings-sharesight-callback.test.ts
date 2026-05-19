import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const { mockGetUser, mockServerFrom, mockCookieStore, mockExchange } =
  vi.hoisted(() => ({
    mockGetUser:
      vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(),
    mockServerFrom: vi.fn(),
    mockCookieStore: {
      get: vi.fn<(name: string) => { value: string } | undefined>(),
      delete: vi.fn(),
      set: vi.fn(),
    },
    mockExchange: vi.fn(),
  }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

vi.mock("@/lib/sharesight/oauth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/sharesight/oauth")>(
    "@/lib/sharesight/oauth",
  );
  return {
    ...actual,
    exchangeCodeForToken: mockExchange,
    getSharesightConfig: () => ({
      clientId: "cid",
      clientSecret: "csec",
      redirectUri: "https://example.com/cb",
      baseUrl: "https://api.sharesight.test",
      scope: "user_data",
    }),
  };
});

// Stub the token-crypto module so the test doesn't need an env-var key.
vi.mock("@/lib/sharesight/token-crypto", () => ({
  encryptToken: vi.fn((p: string) => `enc:${p}`),
  decryptToken: vi.fn((e: string) => e.replace(/^enc:/, "")),
}));

import { GET } from "@/app/api/account/holdings/sharesight/callback/route";

function makeReq(query: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/account/holdings/sharesight/callback");
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString(), { method: "GET" });
}

describe("GET /api/account/holdings/sharesight/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockCookieStore.get.mockReturnValue(undefined);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET(makeReq({ code: "C", state: "S" }));
    expect(res.status).toBe(401);
  });

  it("redirects with error=missing_code_or_state when query is incomplete", async () => {
    const res = await GET(makeReq({ code: "C" }));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toMatch(/sharesight=error/);
    expect(res.headers.get("location")).toMatch(/missing_code_or_state/);
  });

  it("redirects with error when the OAuth provider returns its own error param", async () => {
    const res = await GET(makeReq({ error: "access_denied" }));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toMatch(/provider_access_denied/);
  });

  it("redirects with state_mismatch when the cookie + state diverge", async () => {
    mockCookieStore.get.mockReturnValue({ value: "expected-state" });
    const res = await GET(makeReq({ code: "C", state: "wrong-state" }));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toMatch(/state_mismatch/);
    // Cookie must be cleared on every callback regardless of outcome
    expect(mockCookieStore.delete).toHaveBeenCalledWith("sharesight_oauth_state");
  });

  it("redirects with missing_state_cookie when the cookie is absent", async () => {
    const res = await GET(makeReq({ code: "C", state: "S" }));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toMatch(/missing_state_cookie/);
  });

  it("upserts the OAuth row + redirects with sharesight=connected on success", async () => {
    mockCookieStore.get.mockReturnValue({ value: "ok-state" });
    mockExchange.mockResolvedValueOnce({
      access_token: "A",
      refresh_token: "R",
      expires_in: 7200,
      token_type: "Bearer",
      scope: "user_data",
    });

    type UpsertCall = [Record<string, unknown>, { onConflict: string }];
    const upsertSpy = vi.fn<(...args: UpsertCall) => Promise<{ error: null }>>(
      () => Promise.resolve({ error: null }),
    );
    mockServerFrom.mockReturnValue({ upsert: upsertSpy });

    const res = await GET(makeReq({ code: "C", state: "ok-state" }));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toMatch(/sharesight=connected/);
    expect(mockExchange).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: "cid" }),
      "C",
    );

    expect(upsertSpy).toHaveBeenCalledTimes(1);
    const [payload, opts] = upsertSpy.mock.calls[0]!;
    expect(payload.auth_user_id).toBe("u1");
    expect(payload.provider).toBe("sharesight");
    expect(payload.access_token_enc).toBe("enc:A");
    expect(payload.refresh_token_enc).toBe("enc:R");
    expect(typeof payload.expires_at).toBe("string");
    expect(opts).toMatchObject({ onConflict: "auth_user_id,provider" });
  });

  it("redirects with db_upsert_failed when supabase upsert errors", async () => {
    mockCookieStore.get.mockReturnValue({ value: "ok-state" });
    mockExchange.mockResolvedValueOnce({
      access_token: "A",
      refresh_token: null,
      expires_in: 7200,
      token_type: "Bearer",
      scope: null,
    });
    type UpsertCall = [Record<string, unknown>, { onConflict: string }];
    const upsertSpy = vi.fn<
      (...args: UpsertCall) => Promise<{ error: { message: string } }>
    >(() => Promise.resolve({ error: { message: "unique violation" } }));
    mockServerFrom.mockReturnValue({ upsert: upsertSpy });

    const res = await GET(makeReq({ code: "C", state: "ok-state" }));
    expect(res.headers.get("location")).toMatch(/db_upsert_failed/);
  });

  it("redirects with token_exchange_failed when Sharesight rejects the code", async () => {
    mockCookieStore.get.mockReturnValue({ value: "ok-state" });
    mockExchange.mockRejectedValueOnce(new Error("bad code"));
    const res = await GET(makeReq({ code: "C", state: "ok-state" }));
    expect(res.headers.get("location")).toMatch(/token_exchange_failed/);
  });
});
