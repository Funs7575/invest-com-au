import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// The library reads classifier_config for thresholds and writes to
// article_quality_scores. Mock both supabase and the classifier-
// config shim to keep tests hermetic.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: async () => ({ error: null }),
    }),
  }),
}));

vi.mock("@/lib/admin/classifier-config", () => ({
  getThreshold: async (_c: string, name: string, def: number) => {
    // Let each test override by setting a global.
    const override = (globalThis as unknown as { __thresholds?: Record<string, number> })
      .__thresholds;
    return override?.[name] ?? def;
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }),
}));

import {
  scoreArticle,
  resolveVerdict,
  parseRubricJson,
} from "@/lib/article-quality-scoring";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete (globalThis as unknown as { __thresholds?: Record<string, number> }).__thresholds;
  vi.restoreAllMocks();
});

afterEach(() => {
  for (const k of Object.keys(process.env)) delete process.env[k];
  Object.assign(process.env, ORIGINAL_ENV);
});

describe("resolveVerdict", () => {
  it("auto_rejects when score is below reject_threshold", () => {
    expect(resolveVerdict(30, 100, 80, 40, 60)).toBe("auto_reject");
  });

  it("escalates when compliance is below floor even with high score", () => {
    expect(resolveVerdict(95, 50, 80, 40, 60)).toBe("escalate");
  });

  it("auto_approves when score >= approve_threshold and compliance is fine", () => {
    expect(resolveVerdict(85, 90, 80, 40, 60)).toBe("auto_approve");
  });

  it("escalates between reject and approve thresholds", () => {
    expect(resolveVerdict(60, 80, 80, 40, 60)).toBe("escalate");
  });

  it("treats exactly-approve_threshold as approve", () => {
    expect(resolveVerdict(80, 80, 80, 40, 60)).toBe("auto_approve");
  });

  it("treats exactly-reject_threshold as escalate (not reject)", () => {
    expect(resolveVerdict(40, 80, 80, 40, 60)).toBe("escalate");
  });
});

describe("parseRubricJson", () => {
  it("parses a strict JSON response", () => {
    const r = parseRubricJson(
      '{"rubric":{"clarity":90,"accuracy":80,"completeness":85,"compliance":95,"seo":70},"score":84,"feedback":"Good"}',
    );
    expect(r.rubric.clarity).toBe(90);
    expect(r.score).toBe(84);
    expect(r.feedback).toBe("Good");
  });

  it("strips a json markdown code fence", () => {
    const r = parseRubricJson(
      '```json\n{"rubric":{"clarity":80,"accuracy":80,"completeness":80,"compliance":80,"seo":80},"score":80,"feedback":"ok"}\n```',
    );
    expect(r.score).toBe(80);
  });

  it("clamps out-of-range values to [0, 100]", () => {
    const r = parseRubricJson(
      '{"rubric":{"clarity":150,"accuracy":-20,"completeness":85,"compliance":95,"seo":70},"score":84}',
    );
    expect(r.rubric.clarity).toBe(100);
    expect(r.rubric.accuracy).toBe(0);
  });

  it("returns zeros on parse failure", () => {
    const r = parseRubricJson("not json at all");
    expect(r.rubric.clarity).toBe(0);
    expect(r.score).toBe(0);
    expect(r.feedback).toBe("parse_error");
  });

  it("averages the rubric when score is missing", () => {
    const r = parseRubricJson(
      '{"rubric":{"clarity":80,"accuracy":80,"completeness":80,"compliance":80,"seo":80}}',
    );
    expect(r.score).toBe(80);
  });
});

describe("scoreArticle — stub provider", () => {
  it("escalates when no LLM provider is configured", async () => {
    const r = await scoreArticle({
      articleId: 1,
      articleSlug: "x",
      title: "T",
      content: "lorem ipsum",
    });
    expect(r.provider).toBe("stub");
    expect(r.verdict).toBe("escalate");
  });
});

describe("scoreArticle — claude provider", () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-...";
  });

  it("auto_approves a high-scoring article", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          content: [
            {
              type: "text",
              text: '{"rubric":{"clarity":90,"accuracy":85,"completeness":80,"compliance":95,"seo":75},"score":85,"feedback":"ok"}',
            },
          ],
        }),
      })),
    );
    const r = await scoreArticle({
      articleId: 1,
      articleSlug: "x",
      title: "T",
      content: "...",
    });
    expect(r.provider).toBe("claude");
    expect(r.verdict).toBe("auto_approve");
  });

  it("escalates when compliance is below floor even with high aggregate", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          content: [
            {
              type: "text",
              text: '{"rubric":{"clarity":95,"accuracy":95,"completeness":95,"compliance":40,"seo":95},"score":84,"feedback":"compliance issues"}',
            },
          ],
        }),
      })),
    );
    const r = await scoreArticle({
      articleId: 2,
      articleSlug: "x",
      title: "T",
      content: "...",
    });
    expect(r.verdict).toBe("escalate");
    expect(r.rubric.compliance).toBe(40);
  });

  it("returns escalate verdict on HTTP error without crashing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({}),
      })),
    );
    const r = await scoreArticle({
      articleId: 3,
      articleSlug: "x",
      title: "T",
      content: "...",
    });
    expect(r.verdict).toBe("escalate");
    expect(r.feedback).toContain("provider_error");
  });

  it("honours live-editable thresholds from classifier_config", async () => {
    // Override approve_threshold to 70 so a score of 72 is auto_approve
    (globalThis as unknown as { __thresholds?: Record<string, number> }).__thresholds = {
      approve_threshold: 70,
      reject_threshold: 30,
      compliance_floor: 50,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          content: [
            {
              type: "text",
              text: '{"rubric":{"clarity":72,"accuracy":72,"completeness":72,"compliance":72,"seo":72},"score":72,"feedback":""}',
            },
          ],
        }),
      })),
    );
    const r = await scoreArticle({
      articleId: 4,
      articleSlug: "x",
      title: "T",
      content: "...",
    });
    expect(r.verdict).toBe("auto_approve");
  });
});

describe("scoreArticle — openai provider", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "sk-...";
  });

  it("parses a chat/completions response shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  '{"rubric":{"clarity":30,"accuracy":30,"completeness":30,"compliance":30,"seo":30},"score":30,"feedback":"poor"}',
              },
            },
          ],
        }),
      })),
    );
    const r = await scoreArticle({
      articleId: 5,
      articleSlug: "x",
      title: "T",
      content: "...",
    });
    expect(r.provider).toBe("openai");
    expect(r.verdict).toBe("auto_reject"); // 30 < default reject_threshold 40
  });
});
