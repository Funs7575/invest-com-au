import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

import { GET } from "@/app/api/account/sharesight/connect/route";

function makeReq() {
  return new NextRequest("http://localhost/api/account/sharesight/connect");
}

describe("GET /api/account/sharesight/connect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SHARESIGHT_CLIENT_ID", "");
    vi.stubEnv("SHARESIGHT_CLIENT_SECRET", "");
    vi.stubEnv("SHARESIGHT_OAUTH_STATE_SECRET", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 503 when Sharesight env vars are missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const res = await GET(makeReq());
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("not_configured");
  });

  it("302-redirects to Sharesight authorize URL with signed state when configured", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    vi.stubEnv("SHARESIGHT_CLIENT_ID", "client");
    vi.stubEnv("SHARESIGHT_CLIENT_SECRET", "secret");
    vi.stubEnv("SHARESIGHT_OAUTH_STATE_SECRET", "state-secret");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://invest.com.au");

    const res = await GET(makeReq());
    expect(res.status).toBe(302);
    const location = res.headers.get("location");
    expect(location).not.toBeNull();
    const url = new URL(location!);
    expect(url.origin + url.pathname).toBe("https://api.sharesight.com.au/oauth2/authorize");
    expect(url.searchParams.get("client_id")).toBe("client");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://invest.com.au/api/account/sharesight/callback",
    );
    expect(url.searchParams.get("state")).toBeTruthy();
  });
});
