import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockGetUser, mockServerFrom, mockIsFlagEnabled, mockIsRateLimited, mockGetInvestorProfile, mockAnthropicCreate } =
  vi.hoisted(() => ({
    mockGetUser: vi.fn(),
    mockServerFrom: vi.fn(),
    mockIsFlagEnabled: vi.fn(),
    mockIsRateLimited: vi.fn(),
    mockGetInvestorProfile: vi.fn(),
    mockAnthropicCreate: vi.fn(),
  }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));

vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (...args: unknown[]) => mockIsFlagEnabled(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/investor-profiles", () => ({
  getInvestorProfile: (...args: unknown[]) => mockGetInvestorProfile(...args),
}));

vi.mock("@anthropic-ai/sdk", () => {
  // The route does `new Anthropic({ apiKey })`, so the default export
  // must be a constructable class. A plain `vi.fn()` doesn't always
  // satisfy `new` under the forks pool — use an explicit class.
  class MockAnthropic {
    messages = {
      create: (...args: unknown[]) => mockAnthropicCreate(...args),
    };
  }
  return { default: MockAnthropic };
});

// Logger no-op so test output stays clean.
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { POST } from "@/app/api/account/holdings/ai-analysis/route";
import { GAW_AI_PREFIX } from "@/lib/compliance";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(body: unknown = { acknowledge_general_information: true }): NextRequest {
  return new NextRequest("http://localhost/api/account/holdings/ai-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function authedUser(id = "user-abc", email = "user@test.com") {
  mockGetUser.mockResolvedValue({ data: { user: { id, email } } });
}

function holdingsChain(rows: unknown[] | null, error: unknown = null) {
  const calls: Record<string, { method: string; args: unknown[] }[]> = {};
  const chain = createChainableBuilder("investor_holdings", calls);
  // Final await on .order() should resolve with rows/error.
  chain.order = vi.fn(() => Promise.resolve({ data: rows, error })) as unknown as ReturnType<typeof vi.fn>;
  mockServerFrom.mockReturnValue(chain);
  return chain;
}

function defaultHoldings() {
  return [
    {
      ticker: "VAS",
      exchange: "ASX",
      shares: 100,
      cost_basis_per_share_cents: 9500,
      acquired_at: "2025-01-15",
      broker_slug: "selfwealth",
    },
    {
      ticker: "VGS",
      exchange: "ASX",
      shares: 50,
      cost_basis_per_share_cents: 11000,
      acquired_at: "2024-12-10",
      broker_slug: null,
    },
  ];
}

const SAFE_MODEL_OUTPUT =
  `${GAW_AI_PREFIX}\n` +
  `- Your portfolio is concentrated in Australian equities, higher than a global market-cap weighting.\n` +
  `- Sector exposure leans toward financials and resources.\n` +
  `- Index-tilted holdings dominate, consistent with low-cost passive exposure.`;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/account/holdings/ai-analysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    mockIsRateLimited.mockResolvedValue(false);
    mockIsFlagEnabled.mockResolvedValue(true);
    mockGetInvestorProfile.mockResolvedValue(null);
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: "text", text: SAFE_MODEL_OUTPUT }],
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost());
    expect(res.status).toBe(401);
  });

  it("returns 404 when the feature flag is disabled (default off)", async () => {
    authedUser();
    mockIsFlagEnabled.mockResolvedValue(false);
    const res = await POST(makePost());
    expect(res.status).toBe(404);
    // Do not leak existence of the route via the body either.
    const json = await res.json();
    expect(json.error).toBe("not_found");
  });

  it("returns 400 when acknowledge_general_information is missing", async () => {
    authedUser();
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when acknowledge_general_information is false", async () => {
    authedUser();
    const res = await POST(makePost({ acknowledge_general_information: false }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    authedUser();
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost());
    expect(res.status).toBe(429);
  });

  it("returns 400 when the user has no holdings", async () => {
    authedUser();
    holdingsChain([], null);
    const res = await POST(makePost());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.reason).toBe("no_holdings");
  });

  it("returns 503 when ANTHROPIC_API_KEY is missing", async () => {
    process.env.ANTHROPIC_API_KEY = "";
    authedUser();
    holdingsChain(defaultHoldings(), null);
    const res = await POST(makePost());
    expect(res.status).toBe(503);
  });

  it("returns 200 with observations on the happy path", async () => {
    authedUser();
    holdingsChain(defaultHoldings(), null);
    const res = await POST(makePost());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.observations)).toBe(true);
    expect(json.observations.length).toBeGreaterThanOrEqual(3);
    expect(json.disclaimer).toBeDefined();
  });

  it("returns 200 with ok:false on a compliance filter rejection", async () => {
    authedUser();
    holdingsChain(defaultHoldings(), null);
    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: `${GAW_AI_PREFIX}\n- You should rebalance.\n- Concentration high.\n- Fees low.`,
        },
      ],
    });
    const res = await POST(makePost());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.reason).toBe("compliance_filter_failed");
    expect(json.disclaimer).toBeDefined();
  });

  it("uses the user id in the rate-limit key", async () => {
    authedUser("uid-zzz");
    holdingsChain(defaultHoldings(), null);
    await POST(makePost());
    const args = mockIsRateLimited.mock.calls[0] as [string, number, number];
    expect(args[0]).toContain("uid-zzz");
  });

  it("checks the investor_ai_analysis_enabled feature flag", async () => {
    authedUser();
    holdingsChain(defaultHoldings(), null);
    await POST(makePost());
    const args = mockIsFlagEnabled.mock.calls[0] as [string, unknown];
    expect(args[0]).toBe("investor_ai_analysis_enabled");
  });
});
