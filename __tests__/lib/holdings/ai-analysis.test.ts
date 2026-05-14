import { describe, it, expect, vi } from "vitest";
import {
  formatHoldingsForPrompt,
  runHoldingsAnalysis,
  ANALYSIS_SYSTEM_PROMPT,
  HOLDINGS_PROMPT_CAP,
  type HoldingForAnalysis,
  type ProfileForAnalysis,
} from "@/lib/holdings/ai-analysis";
import { GAW_AI_PREFIX } from "@/lib/compliance";

// ── Helpers ───────────────────────────────────────────────────────────────────

function holding(overrides: Partial<HoldingForAnalysis> = {}): HoldingForAnalysis {
  return {
    ticker: "VAS",
    exchange: "ASX",
    shares: 100,
    cost_basis_per_share_cents: 9500,
    acquired_at: "2025-01-15",
    broker_slug: null,
    ...overrides,
  };
}

const PROFILE: ProfileForAnalysis = {
  isFhb: false,
  isPreRetiree: false,
  isBusinessOwner: false,
  isCrossBorder: false,
  isHnw: false,
};

/**
 * Build a minimal mock for the injected Anthropic client. We only need
 * `messages.create` to resolve to a `{ content: [{ type: "text", text }] }`
 * shape — the engine doesn't touch anything else on the client.
 */
function mockAnthropic(text: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text }],
      }),
    },
    // The engine never touches these but Anthropic typings expect them.
    // Cast through unknown so the test stays decoupled from SDK internals.
  } as unknown as import("@anthropic-ai/sdk").default;
}

// ── formatHoldingsForPrompt ───────────────────────────────────────────────────

describe("formatHoldingsForPrompt", () => {
  it("includes ticker, exchange, shares, and cost basis", () => {
    const prompt = formatHoldingsForPrompt(
      [holding({ ticker: "VGS", exchange: "ASX", shares: 42, cost_basis_per_share_cents: 12345 })],
      PROFILE,
    );
    expect(prompt).toContain("VGS");
    expect(prompt).toContain("ASX");
    expect(prompt).toContain("42 shares");
    expect(prompt).toContain("A$123.45");
  });

  it("includes broker_slug when present", () => {
    const prompt = formatHoldingsForPrompt(
      [holding({ broker_slug: "stake" })],
      PROFILE,
    );
    expect(prompt).toContain("via stake");
  });

  it("renders 'none recorded' when no life-event flags are set", () => {
    const prompt = formatHoldingsForPrompt([holding()], PROFILE);
    expect(prompt).toContain("Profile flags: none recorded.");
  });

  it("lists active life-event flags", () => {
    const prompt = formatHoldingsForPrompt([holding()], {
      isFhb: true,
      isPreRetiree: false,
      isBusinessOwner: true,
      isCrossBorder: false,
      isHnw: true,
    });
    expect(prompt).toContain("first-home buyer");
    expect(prompt).toContain("business owner");
    expect(prompt).toContain("high-net-worth");
  });

  it("caps holdings at HOLDINGS_PROMPT_CAP", () => {
    const big = Array.from({ length: 200 }, (_, i) =>
      holding({ ticker: `TKR${i}` }),
    );
    const prompt = formatHoldingsForPrompt(big, PROFILE);
    // Last included ticker is TKR{cap-1}; first omitted is TKR{cap}.
    expect(prompt).toContain(`TKR${HOLDINGS_PROMPT_CAP - 1}`);
    expect(prompt).not.toContain(`TKR${HOLDINGS_PROMPT_CAP} `);
    expect(prompt).toMatch(/100 additional holdings omitted/);
  });
});

// ── ANALYSIS_SYSTEM_PROMPT ────────────────────────────────────────────────────

describe("ANALYSIS_SYSTEM_PROMPT", () => {
  it("explicitly forbids advice-shaped phrasing", () => {
    expect(ANALYSIS_SYSTEM_PROMPT).toMatch(/you should/i);
    expect(ANALYSIS_SYSTEM_PROMPT).toMatch(/we recommend/i);
    expect(ANALYSIS_SYSTEM_PROMPT).toMatch(/buy now/i);
    expect(ANALYSIS_SYSTEM_PROMPT).toMatch(/sell now/i);
    expect(ANALYSIS_SYSTEM_PROMPT).toMatch(/personal advice/i);
  });

  it("asks for exactly 3 observations covering diversification, concentration, fees", () => {
    expect(ANALYSIS_SYSTEM_PROMPT).toMatch(/EXACTLY 3 observations/);
    expect(ANALYSIS_SYSTEM_PROMPT).toMatch(/diversification/i);
    expect(ANALYSIS_SYSTEM_PROMPT).toMatch(/concentration/i);
    expect(ANALYSIS_SYSTEM_PROMPT).toMatch(/fee efficiency/i);
  });

  it("requires the GAW prefix", () => {
    expect(ANALYSIS_SYSTEM_PROMPT).toContain(GAW_AI_PREFIX);
  });
});

// ── runHoldingsAnalysis ───────────────────────────────────────────────────────

describe("runHoldingsAnalysis", () => {
  it("returns no_holdings when given an empty list", async () => {
    const client = mockAnthropic("unused");
    const result = await runHoldingsAnalysis([], PROFILE, {
      anthropicClient: client,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no_holdings");
  });

  it("returns ok:true with observations when the model output passes the filter", async () => {
    // No numeric stats in the body so we avoid the stat-citation rule entirely.
    // The filter only requires citations directly after a numeric value, so
    // qualitative observations sail through cleanly.
    const safeText =
      `${GAW_AI_PREFIX}\n` +
      `- Your portfolio is concentrated in Australian equities, higher than a global market-cap weighting.\n` +
      `- Sector exposure leans toward financials and resources.\n` +
      `- Index-style holdings dominate, consistent with low-cost passive exposure.`;
    const client = mockAnthropic(safeText);

    const result = await runHoldingsAnalysis([holding()], PROFILE, {
      anthropicClient: client,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.observations.length).toBeGreaterThanOrEqual(3);
      expect(result.observations[0]).toMatch(/concentrat|portfolio/i);
      expect(result.rawText).toContain(GAW_AI_PREFIX);
    }
  });

  it("returns compliance_filter_failed when the model uses 'you should'", async () => {
    const advicey =
      `${GAW_AI_PREFIX}\n` +
      `- You should rebalance into bonds.\n` +
      `- Sector concentration is high.\n` +
      `- Fees look efficient.`;
    const client = mockAnthropic(advicey);

    const result = await runHoldingsAnalysis([holding()], PROFILE, {
      anthropicClient: client,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("compliance_filter_failed");
      expect(result.detail).toMatch(/personal-advice/i);
    }
  });

  it("returns compliance_filter_failed when the GAW prefix is missing", async () => {
    const client = mockAnthropic(
      "- Diversification is reasonable.\n- Concentration is moderate.\n- Fees are low.",
    );
    const result = await runHoldingsAnalysis([holding()], PROFILE, {
      anthropicClient: client,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("compliance_filter_failed");
  });

  it("returns empty_response when the model returns no text blocks", async () => {
    const client = {
      messages: { create: vi.fn().mockResolvedValue({ content: [] }) },
    } as unknown as import("@anthropic-ai/sdk").default;
    const result = await runHoldingsAnalysis([holding()], PROFILE, {
      anthropicClient: client,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("empty_response");
  });

  it("returns model_call_failed when the Anthropic client throws", async () => {
    const client = {
      messages: {
        create: vi.fn().mockRejectedValue(new Error("anthropic 500")),
      },
    } as unknown as import("@anthropic-ai/sdk").default;
    const result = await runHoldingsAnalysis([holding()], PROFILE, {
      anthropicClient: client,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("model_call_failed");
      expect(result.detail).toContain("anthropic 500");
    }
  });

  it("caps input at HOLDINGS_PROMPT_CAP when 200 holdings are passed", async () => {
    const safeText =
      `${GAW_AI_PREFIX}\n- a\n- b\n- c`;
    const client = mockAnthropic(safeText);

    const big = Array.from({ length: 200 }, (_, i) =>
      holding({ ticker: `T${i}` }),
    );
    await runHoldingsAnalysis(big, PROFILE, {
      anthropicClient: client,
    });

    // Inspect the prompt the client received and ensure the 101st ticker
    // was excluded — that confirms the cap was applied before the call.
    const createMock = client.messages.create as unknown as ReturnType<
      typeof vi.fn
    >;
    expect(createMock).toHaveBeenCalledTimes(1);
    const callArgs = createMock.mock.calls[0]?.[0] as {
      messages: { content: string }[];
    };
    const userContent = callArgs.messages[0]?.content ?? "";
    expect(userContent).toContain(`T${HOLDINGS_PROMPT_CAP - 1}`);
    expect(userContent).not.toMatch(new RegExp(`T${HOLDINGS_PROMPT_CAP}\\s`));
    expect(userContent).toMatch(/100 additional holdings omitted/);
  });

  it("uses DEFAULT_ANALYSIS_MODEL when no modelId is given", async () => {
    const safeText = `${GAW_AI_PREFIX}\n- a\n- b\n- c`;
    const client = mockAnthropic(safeText);
    await runHoldingsAnalysis([holding()], PROFILE, {
      anthropicClient: client,
    });
    const createMock = client.messages.create as unknown as ReturnType<
      typeof vi.fn
    >;
    const callArgs = createMock.mock.calls[0]?.[0] as { model: string };
    expect(callArgs.model).toBe("claude-opus-4-7");
  });

  it("honours an injected modelId override", async () => {
    const safeText = `${GAW_AI_PREFIX}\n- a\n- b\n- c`;
    const client = mockAnthropic(safeText);
    await runHoldingsAnalysis([holding()], PROFILE, {
      anthropicClient: client,
      modelId: "claude-opus-4-6",
    });
    const createMock = client.messages.create as unknown as ReturnType<
      typeof vi.fn
    >;
    const callArgs = createMock.mock.calls[0]?.[0] as { model: string };
    expect(callArgs.model).toBe("claude-opus-4-6");
  });
});
