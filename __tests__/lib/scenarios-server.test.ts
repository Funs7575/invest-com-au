import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const { mockSelect, mockEq, mockMaybeSingle, mockFrom } = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn();
  const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  return { mockSelect, mockEq, mockMaybeSingle, mockFrom };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

import { getSharedScenario } from "@/lib/scenarios-server";
import { SCENARIO_PUBLIC_COLUMNS } from "@/lib/scenarios";

const TOKEN = "f".repeat(48);

describe("getSharedScenario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for a too-short token without querying", async () => {
    const out = await getSharedScenario("short");
    expect(out).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("selects ONLY the public columns (no user_id / share_token leak)", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        name: "Aggressive DCA",
        calculator_key: "mortgage_calculator",
        inputs: { loan: 500000 },
        results_snapshot: { repayment: 2500 },
      },
      error: null,
    });
    await getSharedScenario(TOKEN);
    expect(mockSelect).toHaveBeenCalledWith(SCENARIO_PUBLIC_COLUMNS);
    // The public column list must not include identity columns.
    expect(SCENARIO_PUBLIC_COLUMNS).not.toContain("user_id");
    expect(SCENARIO_PUBLIC_COLUMNS).not.toContain("share_token");
    expect(SCENARIO_PUBLIC_COLUMNS).not.toContain("created_at");
    expect(mockEq).toHaveBeenCalledWith("share_token", TOKEN);
  });

  it("maps a found row to the public view shape", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        name: "If we refinance",
        calculator_key: "mortgage_calculator",
        inputs: { loan: 400000 },
        results_snapshot: null,
      },
      error: null,
    });
    const out = await getSharedScenario(TOKEN);
    expect(out).toEqual({
      name: "If we refinance",
      calculator_key: "mortgage_calculator",
      inputs: { loan: 400000 },
      results_snapshot: null,
    });
    // Returned object has exactly the public keys — nothing else.
    expect(Object.keys(out!).sort()).toEqual([
      "calculator_key",
      "inputs",
      "name",
      "results_snapshot",
    ]);
  });

  it("returns null on a DB error (fails soft)", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });
    expect(await getSharedScenario(TOKEN)).toBeNull();
  });

  it("returns null when no row matches the token", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await getSharedScenario(TOKEN)).toBeNull();
  });

  it("defaults a null inputs blob to an empty object", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        name: "X",
        calculator_key: "mortgage_calculator",
        inputs: null,
        results_snapshot: null,
      },
      error: null,
    });
    const out = await getSharedScenario(TOKEN);
    expect(out!.inputs).toEqual({});
  });
});
