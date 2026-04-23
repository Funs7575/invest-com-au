import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

let thresholdRows: Array<{ threshold_name: string; value: number }> | null = [];
let thresholdError: { message: string } | null = null;
let killSwitchRows: Array<{ feature: string; disabled: boolean }> = [];
let killSwitchError: { message: string } | null = null;

const mockFrom = vi.fn((table: string) => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: async () =>
      killSwitchError
        ? { data: null, error: killSwitchError }
        : { data: killSwitchRows, error: null },
    then(cb: (v: unknown) => unknown) {
      // For .from("classifier_config").select(...).eq(...) direct await
      if (table === "classifier_config") {
        return Promise.resolve(
          cb({ data: thresholdRows, error: thresholdError }),
        );
      }
      return Promise.resolve(cb({ data: null, error: null }));
    },
  };
  return chain;
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  getClassifierConfig,
  getThreshold,
  invalidateClassifierConfigCache,
  isFeatureDisabled,
  invalidateKillSwitchCache,
} from "@/lib/admin/classifier-config";

describe("getClassifierConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    thresholdRows = [];
    thresholdError = null;
    invalidateClassifierConfigCache();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns empty object on DB error (fallback to defaults)", async () => {
    thresholdError = { message: "relation doesn't exist" };
    expect(await getClassifierConfig("x")).toEqual({});
  });

  it("returns empty object when table is empty", async () => {
    thresholdRows = [];
    expect(await getClassifierConfig("x")).toEqual({});
  });

  it("returns threshold map when rows are present", async () => {
    thresholdRows = [
      { threshold_name: "min_signals", value: 3 },
      { threshold_name: "max_length", value: 500 },
    ];
    const cfg = await getClassifierConfig("mod_a");
    expect(cfg).toEqual({ min_signals: 3, max_length: 500 });
  });

  it("caches for 60 seconds (second call doesn't re-query)", async () => {
    thresholdRows = [{ threshold_name: "k", value: 7 }];
    const first = await getClassifierConfig("mod_b");
    expect(first).toEqual({ k: 7 });

    thresholdRows = [{ threshold_name: "k", value: 999 }];
    const second = await getClassifierConfig("mod_b");
    expect(second).toEqual({ k: 7 }); // from cache, not refetched
  });

  it("invalidateClassifierConfigCache clears entries", async () => {
    thresholdRows = [{ threshold_name: "k", value: 7 }];
    await getClassifierConfig("mod_c");

    invalidateClassifierConfigCache();
    thresholdRows = [{ threshold_name: "k", value: 999 }];
    const second = await getClassifierConfig("mod_c");
    expect(second).toEqual({ k: 999 });
  });

  it("invalidateClassifierConfigCache with a name only clears that entry", async () => {
    thresholdRows = [{ threshold_name: "k", value: 1 }];
    await getClassifierConfig("alpha");
    await getClassifierConfig("beta");

    invalidateClassifierConfigCache("alpha");
    thresholdRows = [{ threshold_name: "k", value: 2 }];

    const alpha = await getClassifierConfig("alpha");
    const beta = await getClassifierConfig("beta");
    expect(alpha).toEqual({ k: 2 });
    expect(beta).toEqual({ k: 1 }); // beta still cached
  });
});

describe("getThreshold", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    thresholdRows = [];
    invalidateClassifierConfigCache();
  });

  it("returns the DB value when present", async () => {
    thresholdRows = [{ threshold_name: "min", value: 5 }];
    expect(await getThreshold("x", "min", 10)).toBe(5);
  });

  it("returns the default when not present", async () => {
    thresholdRows = [];
    expect(await getThreshold("x", "min", 10)).toBe(10);
  });

  it("returns the default when value is NaN", async () => {
    thresholdRows = [{ threshold_name: "min", value: NaN as unknown as number }];
    expect(await getThreshold("x", "min", 10)).toBe(10);
  });
});

describe("isFeatureDisabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    killSwitchRows = [];
    killSwitchError = null;
    invalidateKillSwitchCache();
  });

  it("returns false when table is empty", async () => {
    killSwitchRows = [];
    expect(await isFeatureDisabled("x")).toBe(false);
  });

  it("returns false on DB error (fail-open)", async () => {
    killSwitchError = { message: "down" };
    expect(await isFeatureDisabled("x")).toBe(false);
  });

  it("returns true when the feature row is disabled", async () => {
    killSwitchRows = [{ feature: "x", disabled: true }];
    expect(await isFeatureDisabled("x")).toBe(true);
  });

  it("returns false when the feature row exists but disabled=false", async () => {
    killSwitchRows = [{ feature: "x", disabled: false }];
    expect(await isFeatureDisabled("x")).toBe(false);
  });

  it("returns true when the global kill switch is on", async () => {
    killSwitchRows = [{ feature: "global", disabled: true }];
    expect(await isFeatureDisabled("anything")).toBe(true);
  });

  it("caches disabled=true for 30 seconds", async () => {
    killSwitchRows = [{ feature: "x", disabled: true }];
    expect(await isFeatureDisabled("x")).toBe(true);

    killSwitchRows = []; // DB cleared
    expect(await isFeatureDisabled("x")).toBe(true); // still cached
  });

  it("invalidateKillSwitchCache clears all entries", async () => {
    killSwitchRows = [{ feature: "x", disabled: true }];
    await isFeatureDisabled("x");

    invalidateKillSwitchCache();
    killSwitchRows = [];
    expect(await isFeatureDisabled("x")).toBe(false);
  });
});
