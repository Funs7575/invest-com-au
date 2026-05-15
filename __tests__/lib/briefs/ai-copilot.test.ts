import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  buildSystemPrompt,
  extractBriefPayload,
} from "@/lib/briefs/ai-copilot";

// Helper — build an Anthropic-shaped Response stub.
function mockAnthropicResponse(text: string, opts: { ok?: boolean; status?: number } = {}) {
  const ok = opts.ok ?? true;
  const status = opts.status ?? 200;
  return {
    ok,
    status,
    json: async () => ({
      content: [{ type: "text", text }],
    }),
  } as unknown as Response;
}

describe("buildSystemPrompt", () => {
  it("includes the brief template slugs, budget bands, and AU states", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("smsf_property");
    expect(prompt).toContain("under_500");
    expect(prompt).toContain("NSW");
    expect(prompt).toContain("ONLY a single JSON object");
  });

  it("instructs the model to flag missing fields rather than invent them", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/missing_fields/);
    expect(prompt).toMatch(/Do NOT invent details/);
  });
});

describe("extractBriefPayload", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns the parsed payload + confidence on a well-formed model response", async () => {
    const body = JSON.stringify({
      payload: {
        brief_template: "smsf_property",
        job_title: "SMSF property strategy in QLD",
        job_description:
          "Considering an SMSF and a QLD investment property purchase within 3 months.",
        budget_band: "2k_5k",
        location_state: "QLD",
        advisor_types: ["smsf_accountant", "property_advisor"],
        brief_payload: { timeline: "1_3_months" },
      },
      confidence: 0.82,
      missing_fields: [],
    });
    const fetchMock = vi.fn().mockResolvedValue(mockAnthropicResponse(body));
    vi.stubGlobal("fetch", fetchMock);

    const result = await extractBriefPayload(
      "I'm thinking about setting up an SMSF to buy a property in QLD in the next few months. Budget ~$3k for advice.",
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.confidence).toBe(0.82);
    expect(result.missing_fields).toEqual([]);
    expect(result.payload.brief_template).toBe("smsf_property");
    expect(result.payload.location_state).toBe("QLD");
    expect(result.payload.advisor_types).toContain("smsf_accountant");
  });

  it("strips ```json fences if Claude wraps the JSON in markdown", async () => {
    const body = "```json\n" + JSON.stringify({
      payload: { job_title: "Mortgage refinance review" },
      confidence: 0.7,
      missing_fields: ["budget_band"],
    }) + "\n```";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockAnthropicResponse(body)));

    const result = await extractBriefPayload(
      "Looking to refinance our home loan, $850k owing on PPOR in Melbourne.",
    );

    expect(result.confidence).toBe(0.7);
    expect(result.payload.job_title).toBe("Mortgage refinance review");
    expect(result.missing_fields).toEqual(["budget_band"]);
  });

  it("returns the failsafe shape when the model output is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockAnthropicResponse("Sorry, I can't help with that today!"),
      ),
    );

    const result = await extractBriefPayload(
      "Hi I would like some help with my finances please thanks.",
    );

    expect(result.confidence).toBe(0);
    expect(result.missing_fields).toEqual(["all"]);
    expect(result.payload).toEqual({});
  });

  it("returns the failsafe shape on a non-2xx Anthropic response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockAnthropicResponse("rate limited upstream", { ok: false, status: 429 }),
      ),
    );

    const result = await extractBriefPayload(
      "I'd like to talk to a financial planner about retirement planning, I'm 58 and based in NSW.",
    );

    expect(result.confidence).toBe(0);
    expect(result.missing_fields).toEqual(["all"]);
  });

  it("returns the failsafe shape when fetch throws (network error / abort)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network unreachable")),
    );

    const result = await extractBriefPayload(
      "I am a 35 year old looking to start investing in shares for the long term.",
    );

    expect(result.confidence).toBe(0);
    expect(result.missing_fields).toEqual(["all"]);
  });

  it("clamps malformed confidence values to 0 (defensive coercion)", async () => {
    const body = JSON.stringify({
      payload: { job_title: "X" },
      confidence: "very high",
      missing_fields: null,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockAnthropicResponse(body)));

    const result = await extractBriefPayload(
      "I'd like a second opinion on the SMSF advice I just received from another firm.",
    );

    expect(result.confidence).toBe(0);
    expect(result.missing_fields).toEqual([]);
    expect(result.payload.job_title).toBe("X");
  });

  it("short-circuits without calling Anthropic when description is too short", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await extractBriefPayload("hi");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.confidence).toBe(0);
    expect(result.missing_fields).toEqual(["all"]);
  });

  it("returns the failsafe shape when ANTHROPIC_API_KEY is unset", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await extractBriefPayload(
      "Need an accountant for a foreign-investor property purchase in Sydney.",
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.confidence).toBe(0);
    expect(result.missing_fields).toEqual(["all"]);
  });
});
