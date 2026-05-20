import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockGetUser = vi.fn(async () => ({
  data: { user: { id: "u1", email: "user@example.com" } },
  error: null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

const mockGetSharesightConfig = vi.fn(() => null);
const mockBuildAuthorizeUrl = vi.fn(() => "https://sharesight.com/oauth2/authorize?state=abc");

vi.mock("@/lib/sharesight/oauth", () => ({
  getSharesightConfig: () => mockGetSharesightConfig(),
  buildAuthorizeUrl: (...args: unknown[]) => mockBuildAuthorizeUrl(...args),
}));

// Mock next/headers cookies
const mockSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: mockSet,
    get: vi.fn(),
    delete: vi.fn(),
  })),
}));

import { GET } from "@/app/api/account/holdings/sharesight/connect/route";

describe("/api/account/holdings/sharesight/connect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "user@example.com" } }, error: null });
    mockGetSharesightConfig.mockReturnValue(null);
    mockBuildAuthorizeUrl.mockReturnValue("https://sharesight.com/oauth2/authorize?state=abc");
  });

  it("rejects unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 503 when sharesight is not configured", async () => {
    mockGetSharesightConfig.mockReturnValue(null);
    const res = await GET();
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("sharesight_not_configured");
  });

  it("redirects to Sharesight authorize URL when configured", async () => {
    mockGetSharesightConfig.mockReturnValue({
      clientId: "test-client-id",
      clientSecret: "test-secret",
      redirectUri: "http://localhost/callback",
    });
    const res = await GET();
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://sharesight.com/oauth2/authorize?state=abc");
  });
});
