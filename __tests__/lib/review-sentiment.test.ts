import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      upsert: async () => ({ error: null }),
    }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }),
}));

import { scoreReview, parseSentimentJson } from "@/lib/review-sentiment";

const ORIGINAL_ENV = { ...process.env };
beforeEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  vi.restoreAllMocks();
});
afterEach(() => {
  for (const k of Object.keys(process.env)) delete process.env[k];
  Object.assign(process.env, ORIGINAL_ENV);
});

describe("parseSentimentJson", () => {
  it("parses a well-formed response", () => {
    const r = parseSentimentJson(
      '{"facets":{"customer_service":80,"fees_value":60,"platform_ux":90,"speed_reliability":85,"trust_accuracy":75},"overall_tone":"positive","summary":"Happy user."}',
    );
    expect(r.facets.customer_service).toBe(80);
    expect(r.overall_tone).toBe("positive");
    expect(r.summary).toBe("Happy user.");
  });

  it("clamps out-of-range facets", () => {
    const r = parseSentimentJson(
      '{"facets":{"customer_service":200,"fees_value":-10,"platform_ux":50,"speed_reliability":50,"trust_accuracy":50},"overall_tone":"neutral"}',
    );
    expect(r.facets.customer_service).toBe(100);
    expect(r.facets.fees_value).toBe(0);
  });

  it("keeps null for facets not mentioned", () => {
    const r = parseSentimentJson(
      '{"facets":{"customer_service":80,"fees_value":null,"platform_ux":null,"speed_reliability":null,"trust_accuracy":null},"overall_tone":"positive"}',
    );
    expect(r.facets.customer_service).toBe(80);
    expect(r.facets.fees_value).toBeNull();
  });

  it("strips markdown code fences", () => {
    const r = parseSentimentJson(
      '```json\n{"facets":{"customer_service":50,"fees_value":50,"platform_ux":50,"speed_reliability":50,"trust_accuracy":50},"overall_tone":"neutral","summary":"ok"}\n```',
    );
    expect(r.facets.customer_service).toBe(50);
  });

  it("normalises unknown tone to 'neutral'", () => {
    const r = parseSentimentJson(
      '{"facets":{"customer_service":null,"fees_value":null,"platform_ux":null,"speed_reliability":null,"trust_accuracy":null},"overall_tone":"enthusiastic"}',
    );
    expect(r.overall_tone).toBe("neutral");
  });

  it("returns a safe default on parse failure", () => {
    const r = parseSentimentJson("not json");
    expect(r.overall_tone).toBe("neutral");
    expect(r.facets.customer_service).toBeNull();
    expect(r.summary).toBe("");
  });
});

describe("scoreReview — stub path", () => {
  it("returns a stub result when no provider configured", async () => {
    const r = await scoreReview({
      review_type: "user_review",
      review_id: 1,
      body: "Solid broker, no complaints.",
    });
    expect(r.provider).toBe("stub");
    expect(r.facets.customer_service).toBeNull();
    expect(r.overall_tone).toBe("neutral");
  });
});

describe("scoreReview — claude happy path", () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
  });

  it("parses a Claude response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          content: [
            {
              type: "text",
              text: '{"facets":{"customer_service":80,"fees_value":75,"platform_ux":70,"speed_reliability":65,"trust_accuracy":85},"overall_tone":"positive","summary":"Happy customer."}',
            },
          ],
        }),
      })),
    );
    const r = await scoreReview({
      review_type: "user_review",
      review_id: 42,
      body: "Great service, low fees.",
    });
    expect(r.provider).toBe("claude");
    expect(r.facets.customer_service).toBe(80);
  });

  it("falls back to stub result on HTTP error (never throws)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({}),
      })),
    );
    const r = await scoreReview({
      review_type: "user_review",
      review_id: 43,
      body: "whatever",
    });
    expect(r.provider).toBe("stub");
  });
});
