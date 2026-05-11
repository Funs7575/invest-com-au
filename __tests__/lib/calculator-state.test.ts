// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import {
  mergeStates,
  getPrefillFor,
  serializeToUrlParams,
  parseFromUrlParams,
  readSessionState,
  writeSessionState,
  clearSessionState,
  claimAnonymousCalculatorState,
  type CalculatorStateMap,
} from "@/lib/calculator-state";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── pure helpers ─────────────────────────────────────────────────

describe("mergeStates", () => {
  it("LWW by captured_at when same key on both sides", () => {
    const older: CalculatorStateMap = {
      tco: { source: "tco", data: { trades: 5 }, captured_at: "2026-05-01T00:00:00Z" },
    };
    const newer: CalculatorStateMap = {
      tco: { source: "tco", data: { trades: 12 }, captured_at: "2026-05-09T00:00:00Z" },
    };
    expect(mergeStates(older, newer).tco?.data.trades).toBe(12);
    // ordering of inputs doesn't matter — newer always wins
    expect(mergeStates(newer, older).tco?.data.trades).toBe(12);
  });

  it("includes keys present on only one side", () => {
    const a: CalculatorStateMap = {
      tco: { source: "tco", data: {}, captured_at: "2026-05-09T00:00:00Z" },
    };
    const b: CalculatorStateMap = {
      mortgage_calculator: {
        source: "mortgage",
        data: {},
        captured_at: "2026-05-09T00:00:00Z",
      },
    };
    const out = mergeStates(a, b);
    expect(out.tco).toBeDefined();
    expect(out.mortgage_calculator).toBeDefined();
  });

  it("returns empty object when no inputs", () => {
    expect(mergeStates()).toEqual({});
  });
});

describe("getPrefillFor", () => {
  it("maps savings balance → tco amt", () => {
    const state: CalculatorStateMap = {
      savings_calculator: {
        source: "savings_calculator",
        data: { balance: 25000, current_rate: 4.5 },
        captured_at: "2026-05-09T00:00:00Z",
      },
    };
    const prefill = getPrefillFor("tco", state);
    expect(prefill).toEqual({ amt: 25000 });
  });

  it("returns empty when source calculator is absent", () => {
    expect(getPrefillFor("tco", {})).toEqual({});
  });

  it("skips fields with empty/null/undefined values", () => {
    const state: CalculatorStateMap = {
      savings_calculator: {
        source: "savings_calculator",
        data: { balance: null, current_rate: 4.5 },
        captured_at: "2026-05-09T00:00:00Z",
      },
    };
    const prefill = getPrefillFor("tco", state);
    // balance is null → skipped; no amt entry
    expect("amt" in prefill).toBe(false);
  });

  it("does not crash for unknown destination calculator", () => {
    expect(getPrefillFor("unknown", {})).toEqual({});
  });
});

describe("URL serialization", () => {
  it("round-trips through URLSearchParams with prefix", () => {
    const data = { monthly_trades: 12, us_pct: 40, label: "active trader" };
    const params = serializeToUrlParams("tco", data);
    expect(params.get("tco_monthly_trades")).toBe("12");
    expect(params.get("tco_us_pct")).toBe("40");

    const parsed = parseFromUrlParams("tco", params);
    expect(parsed).toEqual({
      monthly_trades: "12",
      us_pct: "40",
      label: "active trader",
    });
  });

  it("ignores params without the prefix", () => {
    const params = new URLSearchParams("tco_x=1&other_y=2");
    expect(parseFromUrlParams("tco", params)).toEqual({ x: "1" });
  });

  it("skips empty/null/undefined when serializing", () => {
    const params = serializeToUrlParams("x", { a: 1, b: null, c: undefined, d: "" });
    expect(params.get("x_a")).toBe("1");
    expect(params.has("x_b")).toBe(false);
    expect(params.has("x_c")).toBe(false);
    expect(params.has("x_d")).toBe(false);
  });
});

// ─── sessionStorage helpers ──────────────────────────────────────

describe("session storage", () => {
  beforeEach(() => {
    // jsdom provides window.sessionStorage; reset between tests
    if (typeof window !== "undefined") window.sessionStorage.clear();
  });

  it("write then read round-trips", () => {
    writeSessionState("tco", { source: "tco_calc", data: { trades: 10 } });
    const read = readSessionState();
    expect(read.tco?.source).toBe("tco_calc");
    expect(read.tco?.data.trades).toBe(10);
    expect(typeof read.tco?.captured_at).toBe("string");
  });

  it("multiple writes accumulate, latest entry wins per key", () => {
    writeSessionState("tco", { source: "a", data: { trades: 1 } });
    writeSessionState("mortgage_calculator", { source: "b", data: { loan: 500000 } });
    writeSessionState("tco", { source: "a", data: { trades: 2 } });
    const read = readSessionState();
    expect(read.tco?.data.trades).toBe(2);
    expect(read.mortgage_calculator?.data.loan).toBe(500000);
  });

  it("read tolerates malformed JSON in storage", () => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem("calculator_state_map", "{not-json");
    expect(readSessionState()).toEqual({});
  });

  it("clearSessionState empties everything", () => {
    writeSessionState("tco", { source: "t", data: {} });
    clearSessionState();
    expect(readSessionState()).toEqual({});
  });
});

// ─── claim flow ──────────────────────────────────────────────────

describe("claimAnonymousCalculatorState", () => {
  beforeEach(() => {
    vi.mocked(createAdminClient).mockReset();
  });

  function buildClient(opts: {
    anonRow: { calculator_state: unknown } | null;
    existingState: unknown;
    upsertError?: { message: string } | null;
  }) {
    const upsert = vi.fn((..._args: unknown[]) =>
      Promise.resolve({ data: null, error: opts.upsertError ?? null }),
    );
    const fromImpl = (table: string) => {
      if (table === "anonymous_saves") {
        return {
          select: () => ({
            eq: () => ({
              is: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: opts.anonRow, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "user_calculator_state") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { state: opts.existingState },
                  error: null,
                }),
            }),
          }),
          upsert,
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    };
    return { from: vi.fn(fromImpl), upsertSpy: upsert };
  }

  it("returns 0 when no anonymous state exists for the session", async () => {
    const { from } = buildClient({ anonRow: null, existingState: {} });
    vi.mocked(createAdminClient).mockReturnValue({ from } as never);
    const claimed = await claimAnonymousCalculatorState("sess-1", "user-1");
    expect(claimed).toBe(0);
  });

  it("returns 0 when state is empty object", async () => {
    const { from } = buildClient({
      anonRow: { calculator_state: {} },
      existingState: {},
    });
    vi.mocked(createAdminClient).mockReturnValue({ from } as never);
    const claimed = await claimAnonymousCalculatorState("sess-1", "user-1");
    expect(claimed).toBe(0);
  });

  it("merges anonymous state, returning count of claimed keys", async () => {
    const incoming = {
      tco: { source: "t", data: { x: 1 }, captured_at: "2026-05-09T01:00:00Z" },
      savings_calculator: {
        source: "s",
        data: {},
        captured_at: "2026-05-09T01:00:00Z",
      },
    };
    const { from, upsertSpy } = buildClient({
      anonRow: { calculator_state: incoming },
      existingState: {},
    });
    vi.mocked(createAdminClient).mockReturnValue({ from } as never);

    const claimed = await claimAnonymousCalculatorState("sess-1", "user-1");
    expect(claimed).toBe(2);
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    const upsertArgs = upsertSpy.mock.calls[0]?.[0] as unknown as {
      state: CalculatorStateMap;
    };
    expect(Object.keys(upsertArgs.state).sort()).toEqual([
      "savings_calculator",
      "tco",
    ]);
  });

  it("LWW-merges when same key exists in both DB and anon row", async () => {
    const incoming = {
      tco: { source: "incoming", data: { x: 99 }, captured_at: "2026-05-09T03:00:00Z" },
    };
    const existing = {
      tco: { source: "existing", data: { x: 1 }, captured_at: "2026-05-09T01:00:00Z" },
    };
    const { from, upsertSpy } = buildClient({
      anonRow: { calculator_state: incoming },
      existingState: existing,
    });
    vi.mocked(createAdminClient).mockReturnValue({ from } as never);

    await claimAnonymousCalculatorState("sess-1", "user-1");
    const upsertArgs = upsertSpy.mock.calls[0]?.[0] as unknown as {
      state: CalculatorStateMap;
    };
    expect(upsertArgs.state.tco?.data.x).toBe(99);
  });

  it("DB wins over older anonymous state", async () => {
    const incoming = {
      tco: { source: "incoming", data: { x: 1 }, captured_at: "2026-05-09T01:00:00Z" },
    };
    const existing = {
      tco: { source: "existing", data: { x: 99 }, captured_at: "2026-05-09T03:00:00Z" },
    };
    const { from, upsertSpy } = buildClient({
      anonRow: { calculator_state: incoming },
      existingState: existing,
    });
    vi.mocked(createAdminClient).mockReturnValue({ from } as never);

    await claimAnonymousCalculatorState("sess-1", "user-1");
    const upsertArgs = upsertSpy.mock.calls[0]?.[0] as unknown as {
      state: CalculatorStateMap;
    };
    expect(upsertArgs.state.tco?.data.x).toBe(99);
  });

  it("returns 0 when upsert fails", async () => {
    const incoming = {
      tco: { source: "t", data: {}, captured_at: "2026-05-09T01:00:00Z" },
    };
    const { from } = buildClient({
      anonRow: { calculator_state: incoming },
      existingState: {},
      upsertError: { message: "boom" },
    });
    vi.mocked(createAdminClient).mockReturnValue({ from } as never);

    expect(await claimAnonymousCalculatorState("sess-1", "user-1")).toBe(0);
  });
});
