import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockAuthSignInWithOtp = vi.fn(() => Promise.resolve({ error: null }));
const mockAuthSignInWithPassword = vi.fn(() => Promise.resolve({ data: { user: { id: "uuid-123" } }, error: null }));
const mockAuthSignUp = vi.fn(() => Promise.resolve({ data: { user: { id: "uuid-123" }, session: {} }, error: null }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: {
      signInWithOtp: mockAuthSignInWithOtp,
      signInWithPassword: mockAuthSignInWithPassword,
      signUp: mockAuthSignUp,
    },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => Promise.resolve(false)),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: vi.fn(() => "https://invest.com.au"),
}));

// ── Import route AFTER mocks ──────────────────────────────────────────────────
import { POST } from "@/app/api/advisor-auth/login/route";
import { isRateLimited } from "@/lib/rate-limit";

describe("POST /api/advisor-auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === "professionals") {
        return createChainableBuilder("professionals");
      }
      return createChainableBuilder("professionals");
    });
  });

  it("returns success for magic link with registered email", async () => {
    const res = await POST(makeRequest("POST", { email: "jane@advisor.com.au", mode: "magic" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("returns success even for unregistered email (magic link)", async () => {
    mockFrom.mockImplementation(() => createChainableBuilder("professionals"));
    const res = await POST(makeRequest("POST", { email: "nobody@test.com", mode: "magic" }));
    expect(res.status).toBe(200);
  });

  it("rejects rate-limited requests", async () => {
    vi.mocked(isRateLimited).mockResolvedValueOnce(true);
    const res = await POST(makeRequest("POST", { email: "jane@advisor.com.au", mode: "magic" }));
    expect(res.status).toBe(429);
  });

  it("requires email", async () => {
    const res = await POST(makeRequest("POST", {}));
    expect(res.status).toBe(400);
  });

  it("password login returns 404 for unregistered email", async () => {
    mockFrom.mockImplementation(() => createChainableBuilder("professionals"));
    const res = await POST(makeRequest("POST", { email: "nobody@test.com", password: "test1234", mode: "password" }));
    expect(res.status).toBe(404);
  });
});
