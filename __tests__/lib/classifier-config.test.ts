import { describe, it, expect, beforeEach, vi } from "vitest";

// Build a configurable mock that lets each test control what the
// "classifier_config" + "automation_kill_switches" tables return.
let configRows: Array<{ classifier: string; threshold_name: string; value: number }> = [];
let killSwitchRows: Array<{ feature: string; disabled: boolean }> = [];
let queryCount = 0;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, val: string) => {
          queryCount++;
          if (table === "classifier_config") {
            return Promise.resolve({
              data: configRows.filter((r) => r.classifier === val),
              error: null,
            });
          }
          return Promise.resolve({ data: [], error: null });
        },
        in: (_col: string, vals: string[]) => {
          queryCount++;
          if (table === "automation_kill_switches") {
            return Promise.resolve({
              data: killSwitchRows.filter((r) => vals.includes(r.feature)),
              error: null,
            });
          }
          return Promise.resolve({ data: [], error: null });
        },
      }),
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

import {
  getClassifierConfig,
  getThreshold,
  invalidateClassifierConfigCache,
  isFeatureDisabled,
  invalidateKillSwitchCache,
} from "@/lib/admin/classifier-config";

beforeEach(() => {
  configRows = [];
  killSwitchRows = [];
  queryCount = 0;
  invalidateClassifierConfigCache();
  invalidateKillSwitchCache();
});

describe("getClassifierConfig", () => {
  it("returns empty map when no rows match", async () => {
    const cfg = await getClassifierConfig("text_moderation");
    expect(cfg).toEqual({});
  });

  it("returns all thresholds for the classifier", async () => {
    configRows = [
      { classifier: "text_moderation", threshold_name: "min_spam_signals", value: 3 },
      { classifier: "text_moderation", threshold_name: "max_link_density", value: 0.4 },
      { classifier: "other", threshold_name: "foo", value: 99 },
    ];
    const cfg = await getClassifierConfig("text_moderation");
    expect(cfg).toEqual({ min_spam_signals: 3, max_link_density: 0.4 });
  });

  it("caches results across calls", async () => {
    configRows = [{ classifier: "x", threshold_name: "a", value: 1 }];
    await getClassifierConfig("x");
    await getClassifierConfig("x");
    await getClassifierConfig("x");
    expect(queryCount).toBe(1);
  });

  it("invalidateClassifierConfigCache forces a refetch", async () => {
    configRows = [{ classifier: "x", threshold_name: "a", value: 1 }];
    await getClassifierConfig("x");
    invalidateClassifierConfigCache("x");
    await getClassifierConfig("x");
    expect(queryCount).toBe(2);
  });
});

describe("getThreshold", () => {
  it("returns the configured value when present", async () => {
    configRows = [{ classifier: "foo", threshold_name: "warn", value: 7 }];
    const v = await getThreshold("foo", "warn", 5);
    expect(v).toBe(7);
  });

  it("falls back to the default when not configured", async () => {
    const v = await getThreshold("foo", "warn", 5);
    expect(v).toBe(5);
  });

  it("falls back to the default when value is NaN", async () => {
    configRows = [{ classifier: "foo", threshold_name: "warn", value: Number.NaN }];
    const v = await getThreshold("foo", "warn", 5);
    expect(v).toBe(5);
  });
});

describe("isFeatureDisabled", () => {
  it("returns false when no kill switches are set", async () => {
    expect(await isFeatureDisabled("text_moderation")).toBe(false);
  });

  it("returns true when the feature-specific kill switch is on", async () => {
    killSwitchRows = [{ feature: "text_moderation", disabled: true }];
    expect(await isFeatureDisabled("text_moderation")).toBe(true);
  });

  it("returns true when the global kill switch is on", async () => {
    killSwitchRows = [{ feature: "global", disabled: true }];
    expect(await isFeatureDisabled("any_feature")).toBe(true);
  });

  it("returns false when a feature's switch exists but is off", async () => {
    killSwitchRows = [{ feature: "text_moderation", disabled: false }];
    expect(await isFeatureDisabled("text_moderation")).toBe(false);
  });
});
