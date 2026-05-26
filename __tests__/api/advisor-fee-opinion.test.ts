import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "127.0.0.1",
}));

const mockClassify = vi.fn();
vi.mock("@/lib/chatbot", () => ({
  classifyUserMessage: (...args: unknown[]) => mockClassify(...args),
}));

const mockPreCheckCaps = vi.fn();
const mockRecordUsage = vi.fn();
const mockCapRejectionPayload = vi.fn();
vi.mock("@/lib/ai-cost-caps", () => ({
  loadAdvisorFeeOpinionConfig: vi.fn(() => ({
    route: "advisor_fee_opinion",
    subjectType: "public_session",
    perSubjectMicros: 500_000,
    globalMicros: 20_000_000,
    label: "advisor fee opinion",
  })),
  preCheckCaps: (...args: unknown[]) => mockPreCheckCaps(...args),
  recordUsage: (...args: unknown[]) => mockRecordUsage(...args),
  capRejectionPayload: (...args: unknown[]) => mockCapRejectionPayload(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

// Supabase mock — returns advisor + peers
const mockMaybeSingle = vi.fn();
const mockDbChain = {
  select: vi.fn(),
  eq: vi.fn(),
  not: vi.fn(),
  maybeSingle: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => mockDbChain),
  })),
}));

const mockFetch = vi.fn();

import { POST } from "@/app/api/advisor/fee-opinion/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_BODY = {
  advisorSlug: "jane-smith-cfp",
  feeContext: "Annual ongoing fee: 1.2% AUM. Financial planner in NSW.",
};

const DISCLAIMER =
  "General information only — not personal financial advice. " +
  "Individual costs depend on your specific situation and how products are actually applied. " +
  "Always verify fees directly with the advisor before engaging.";

const MOCK_ADVISOR = {
  id: 42,
  name: "Jane Smith",
  type: "financial-planner",
  fee_structure: "percentage of AUM",
  fee_description: "1.2% per annum",
  hourly_rate_cents: null,
  flat_fee_cents: null,
  aum_percentage: 1.2,
};

const MOCK_PEERS = [
  { hourly_rate_cents: null, flat_fee_cents: null, aum_percentage: 0.8, fee_structure: "percentage of AUM" },
  { hourly_rate_cents: null, flat_fee_cents: null, aum_percentage: 1.0, fee_structure: "percentage of AUM" },
  { hourly_rate_cents: null, flat_fee_cents: null, aum_percentage: 1.2, fee_structure: "percentage of AUM" },
  { hourly_rate_cents: null, flat_fee_cents: null, aum_percentage: 1.5, fee_structure: "percentage of AUM" },
  { hourly_rate_cents: null, flat_fee_cents: null, aum_percentage: 2.0, fee_structure: "percentage of AUM" },
];

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/advisor/fee-opinion", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function makeAnthropicResponse(text: string, status = 200) {
  return Promise.resolve(
    new Response(
      JSON.stringify({
        content: [{ type: "text", text }],
        usage: { input_tokens: 200, output_tokens: 100 },
      }),
      { status, headers: { "content-type": "application/json" } },
    ),
  );
}

function setupDbMocks(advisor = MOCK_ADVISOR, peers = MOCK_PEERS) {
  let callCount = 0;
  // Each .from() call returns the chain; chainable methods return the chain;
  // maybeSingle() resolves the first call (advisor lookup),
  // terminal promise resolves the second call (peers aggregate).
  mockDbChain.select.mockImplementation(() => mockDbChain);
  mockDbChain.eq.mockImplementation(() => mockDbChain);
  mockDbChain.not.mockImplementation(() => mockDbChain);
  mockMaybeSingle.mockImplementation(async () => {
    callCount++;
    if (callCount === 1) return { data: advisor, error: null };
    return { data: null, error: null };
  });
  mockDbChain.maybeSingle.mockImplementation(() => mockMaybeSingle());

  // For peers query — the chain itself is awaited (then callback)
  (mockDbChain as Record<string, unknown>).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data: peers, error: null }));
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor/fee-opinion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    mockIsAllowed.mockResolvedValue(true);
    mockClassify.mockReturnValue({ flagged: false, reason: null });
    mockPreCheckCaps.mockResolvedValue({ allowed: true, perSubjectMicros: 0, globalMicros: 0 });
    mockRecordUsage.mockResolvedValue({});
    mockCapRejectionPayload.mockReturnValue({
      body: { error: "Daily AI spend cap reached." },
      status: 429,
      headers: {},
    });
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key-abc");
    vi.stubEnv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001");
    setupDbMocks();
    mockFetch.mockImplementation(() =>
      makeAnthropicResponse(
        `Jane Smith's AUM fee of 1.2% sits at the 60th percentile among comparable financial planners. The median AUM fee is 1.0%, meaning this advisor charges slightly above the midpoint. AUM fees mean you pay a percentage of your invested assets each year — on $100,000 that's $1,200 annually. ${DISCLAIMER}`,
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // ── Rate limiting ────────────────────────────────────────────────────────────

  it("returns 429 when rate limit exceeded", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/too many/i);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── Body validation ──────────────────────────────────────────────────────────

  it("returns 400 when advisorSlug is missing", async () => {
    const res = await POST(makePost({ feeContext: VALID_BODY.feeContext }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when feeContext is too short", async () => {
    const res = await POST(makePost({ advisorSlug: "slug", feeContext: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when feeContext exceeds 600 chars", async () => {
    const res = await POST(makePost({ advisorSlug: "slug", feeContext: "x".repeat(601) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when advisorSlug exceeds 120 chars", async () => {
    const res = await POST(makePost({ advisorSlug: "x".repeat(121), feeContext: VALID_BODY.feeContext }));
    expect(res.status).toBe(400);
  });

  // ── Classifier ───────────────────────────────────────────────────────────────

  it("returns 400 when classifier flags harmful content", async () => {
    mockClassify.mockReturnValue({ flagged: true, reason: "harmful_content" });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("proceeds when classifier flags personal_advice_request (factual context is fine)", async () => {
    mockClassify.mockReturnValue({ flagged: true, reason: "personal_advice_request" });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  // ── Advisor not found ────────────────────────────────────────────────────────

  it("returns 404 when advisor slug does not exist", async () => {
    mockDbChain.maybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(404);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns 404 when DB returns error on advisor lookup", async () => {
    mockDbChain.maybeSingle.mockResolvedValue({ data: null, error: { message: "DB error" } });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(404);
  });

  // ── AI cost caps ─────────────────────────────────────────────────────────────

  it("returns 429 when cost cap pre-check rejects", async () => {
    mockPreCheckCaps.mockResolvedValue({
      allowed: false,
      reason: "per_subject",
      retryAfterSeconds: 3600,
    });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── No API key — stub mode ───────────────────────────────────────────────────

  it("returns stub opinion when ANTHROPIC_API_KEY is unset", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.opinion).toContain("Jane Smith");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── Claude API errors ────────────────────────────────────────────────────────

  it("returns 503 when Claude API returns non-ok status", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ error: "overloaded" }), { status: 529 })),
    );
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(503);
  });

  it("returns 503 when fetch throws network error", async () => {
    mockFetch.mockRejectedValue(new Error("network timeout"));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(503);
  });

  // ── Successful opinion ───────────────────────────────────────────────────────

  it("returns 200 with opinion on success", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("opinion");
    expect(typeof json.opinion).toBe("string");
    expect(json.opinion.length).toBeGreaterThan(0);
  });

  it("always includes disclaimer in opinion", async () => {
    mockFetch.mockImplementation(() =>
      makeAnthropicResponse("Jane Smith charges 1.2% AUM. The median is 1.0%."),
    );
    const res = await POST(makePost(VALID_BODY));
    const json = await res.json();
    expect(json.opinion).toContain(DISCLAIMER);
  });

  it("does not duplicate disclaimer when Claude already includes it", async () => {
    const replyWithDisclaimer = `AUM fee of 1.2% is above the median. ${DISCLAIMER}`;
    mockFetch.mockImplementation(() => makeAnthropicResponse(replyWithDisclaimer));
    const res = await POST(makePost(VALID_BODY));
    const json = await res.json();
    const count = (json.opinion as string).split(DISCLAIMER).length - 1;
    expect(count).toBe(1);
  });

  it("calls recordUsage after a successful response", async () => {
    await POST(makePost(VALID_BODY));
    await vi.runAllTimersAsync().catch(() => {});
    expect(mockRecordUsage).toHaveBeenCalledOnce();
    const arg = mockRecordUsage.mock.calls[0]?.[0] as { tokensIn: number; tokensOut: number };
    expect(arg.tokensIn).toBe(200);
    expect(arg.tokensOut).toBe(100);
  });

  it("sends correct max_tokens to Anthropic", async () => {
    await POST(makePost(VALID_BODY));
    expect(mockFetch).toHaveBeenCalledOnce();
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const sentBody = JSON.parse(options.body as string) as { max_tokens: number };
    expect(sentBody.max_tokens).toBe(350);
  });
});
