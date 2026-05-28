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
  loadCalculatorExplainConfig: vi.fn(() => ({
    route: "calculator_explain",
    subjectType: "public_session",
    perSubjectMicros: 1_000_000,
    globalMicros: 30_000_000,
    label: "calculator explain",
  })),
  preCheckCaps: (...args: unknown[]) => mockPreCheckCaps(...args),
  recordUsage: (...args: unknown[]) => mockRecordUsage(...args),
  capRejectionPayload: (...args: unknown[]) => mockCapRejectionPayload(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

// Stub global fetch for Anthropic API calls
const mockFetch = vi.fn();

import { POST } from "@/app/api/calculator/explain/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_BODY = {
  calculatorId: "trade-cost",
  context: "Trade amount: $5,000 on ASX. Cheapest: Pearler at $5.50. Most expensive: CommSec at $19.95.",
};

const DISCLAIMER =
  "General information only — not personal financial advice. " +
  "Individual costs depend on your specific situation and how products are actually applied. " +
  "Always verify fees with the provider before investing.";

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/calculator/explain", {
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
        usage: { input_tokens: 120, output_tokens: 80 },
      }),
      { status, headers: { "content-type": "application/json" } },
    ),
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/calculator/explain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    mockIsAllowed.mockResolvedValue(true);
    mockClassify.mockReturnValue({ flagged: false, reason: null });
    mockPreCheckCaps.mockResolvedValue({ allowed: true, perSubjectMicros: 0, globalMicros: 0 });
    mockRecordUsage.mockResolvedValue({});
    mockCapRejectionPayload.mockReturnValue({
      body: { error: "Daily AI spend cap reached. Try again tomorrow." },
      status: 429,
      headers: {},
    });
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key-abc");
    vi.stubEnv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001");

    mockFetch.mockImplementation(() =>
      makeAnthropicResponse(
        `Pearler charges a flat $5.50 brokerage fee per ASX trade, making it the cheapest option in this comparison. CommSec's fee of $19.95 is percentage-based, which means it hurts more on smaller trade sizes. Switching to the cheapest platform saves $14.45 per trade. ${DISCLAIMER}`,
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

  it("returns 400 when calculatorId is missing", async () => {
    const res = await POST(makePost({ context: VALID_BODY.context }));
    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns 400 when context is too short", async () => {
    const res = await POST(makePost({ calculatorId: "trade-cost", context: "short" }));
    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns 400 when context exceeds 800 chars", async () => {
    const res = await POST(makePost({ calculatorId: "trade-cost", context: "x".repeat(801) }));
    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns 400 when calculatorId exceeds 64 chars", async () => {
    const res = await POST(makePost({ calculatorId: "x".repeat(65), context: VALID_BODY.context }));
    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── Classifier ───────────────────────────────────────────────────────────────

  it("returns 400 when classifier flags content (non-personal-advice-request)", async () => {
    mockClassify.mockReturnValue({ flagged: true, reason: "harmful_content" });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("continues when classifier flags personal_advice_request (explain is still factual)", async () => {
    // The route only blocks non-personal-advice-request flags; personal_advice_request
    // goes through so Claude can give factual number explanation, not advice.
    mockClassify.mockReturnValue({ flagged: true, reason: "personal_advice_request" });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("continues when classifier does not flag", async () => {
    mockClassify.mockReturnValue({ flagged: false, reason: null });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledOnce();
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
    const json = await res.json();
    expect(json.error).toBeTruthy();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── No API key — stub mode ───────────────────────────────────────────────────

  it("returns stub explanation when ANTHROPIC_API_KEY is unset", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.explanation).toContain(VALID_BODY.context);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── Claude API errors ────────────────────────────────────────────────────────

  it("returns 503 when Claude API returns non-ok status", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ error: "overloaded" }), { status: 529 })),
    );
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/unavailable/i);
  });

  it("returns 503 when fetch throws (network error)", async () => {
    mockFetch.mockRejectedValue(new Error("network timeout"));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/unavailable/i);
  });

  // ── Successful explanation ───────────────────────────────────────────────────

  it("returns 200 with explanation on success", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("explanation");
    expect(typeof json.explanation).toBe("string");
    expect(json.explanation.length).toBeGreaterThan(0);
  });

  it("always includes disclaimer in explanation", async () => {
    // Claude response that omits the disclaimer — route must append it.
    mockFetch.mockImplementation(() =>
      makeAnthropicResponse("Pearler is cheapest at $5.50. CommSec charges $19.95."),
    );
    const res = await POST(makePost(VALID_BODY));
    const json = await res.json();
    expect(json.explanation).toContain(DISCLAIMER);
  });

  it("does not duplicate disclaimer when Claude already includes it", async () => {
    const replyWithDisclaimer = `Pearler is cheapest at $5.50. CommSec charges $19.95. ${DISCLAIMER}`;
    mockFetch.mockImplementation(() => makeAnthropicResponse(replyWithDisclaimer));
    const res = await POST(makePost(VALID_BODY));
    const json = await res.json();
    const count = (json.explanation as string).split(DISCLAIMER).length - 1;
    expect(count).toBe(1);
  });

  it("calls recordUsage after a successful response", async () => {
    await POST(makePost(VALID_BODY));
    // recordUsage is fire-and-forget — wait a tick for the promise to resolve
    await vi.runAllTimersAsync().catch(() => {});
    expect(mockRecordUsage).toHaveBeenCalledOnce();
    const callArg = mockRecordUsage.mock.calls[0]?.[0] as {
      tokensIn: number;
      tokensOut: number;
    };
    expect(callArg.tokensIn).toBe(120);
    expect(callArg.tokensOut).toBe(80);
  });

  it("sends correct model and max_tokens to Anthropic", async () => {
    await POST(makePost(VALID_BODY));
    expect(mockFetch).toHaveBeenCalledOnce();
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const sentBody = JSON.parse(options.body as string) as {
      model: string;
      max_tokens: number;
    };
    expect(sentBody.model).toBe("claude-haiku-4-5-20251001");
    expect(sentBody.max_tokens).toBe(400);
  });

  it("handles Claude returning empty content array gracefully", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ content: [], usage: { input_tokens: 10, output_tokens: 0 } }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    // Empty reply → only disclaimer returned
    expect(json.explanation).toContain(DISCLAIMER);
  });
});
