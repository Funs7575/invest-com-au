import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

interface UsageRow {
  subject_id: string;
  subject_type: string;
  route: string;
  day: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd_micros: number;
  request_count: number;
  alerted_80_at: string | null;
}

let usageRows: UsageRow[] = [];
let siteSettings: Record<string, string> = {};
const upsertCalls: Record<string, unknown>[] = [];

function findUsageRow(filters: {
  subject_id?: string;
  subject_type?: string;
  route?: string;
  day?: string;
}): UsageRow | undefined {
  return usageRows.find(
    (r) =>
      (filters.subject_id == null || r.subject_id === filters.subject_id) &&
      (filters.subject_type == null || r.subject_type === filters.subject_type) &&
      (filters.route == null || r.route === filters.route) &&
      (filters.day == null || r.day === filters.day),
  );
}

function filterUsageRows(filters: { route?: string; day?: string }): UsageRow[] {
  return usageRows.filter(
    (r) =>
      (filters.route == null || r.route === filters.route) &&
      (filters.day == null || r.day === filters.day),
  );
}

const mockFrom = vi.fn((table: string) => {
  if (table === "ai_token_usage") {
    return makeAiUsageBuilder();
  }
  if (table === "site_settings") {
    return makeSettingsBuilder();
  }
  throw new Error(`unexpected table: ${table}`);
});

function makeAiUsageBuilder() {
  const filters: Record<string, string> = {};
  const builder = {
    select: () => builder,
    eq: (col: string, val: string) => {
      filters[col] = val;
      return builder;
    },
    maybeSingle: async () => ({ data: findUsageRow(filters) || null, error: null }),
    upsert: async (row: Record<string, unknown>) => {
      upsertCalls.push(row);
      const idx = usageRows.findIndex(
        (r) =>
          r.subject_id === row.subject_id &&
          r.subject_type === row.subject_type &&
          r.route === row.route &&
          r.day === row.day,
      );
      const merged: UsageRow = {
        subject_id: row.subject_id as string,
        subject_type: row.subject_type as string,
        route: row.route as string,
        day: row.day as string,
        tokens_in: row.tokens_in as number,
        tokens_out: row.tokens_out as number,
        cost_usd_micros: row.cost_usd_micros as number,
        request_count: row.request_count as number,
        alerted_80_at: (row.alerted_80_at as string | null) ?? null,
      };
      if (idx >= 0) usageRows[idx] = merged;
      else usageRows.push(merged);
      return { data: null, error: null };
    },
    // For the global query — `select(...).eq("route", x).eq("day", y)` (no maybeSingle).
    // Vitest: when awaited as a thenable, return the filtered rows.
    then: (cb: (v: { data: UsageRow[]; error: null }) => unknown) =>
      Promise.resolve({
        data: filterUsageRows(filters),
        error: null,
      }).then(cb),
  };
  return builder;
}

function makeSettingsBuilder() {
  const filters: Record<string, string> = {};
  return {
    select: () => ({
      eq: (col: string, val: string) => {
        filters[col] = val;
        return {
          maybeSingle: async () => {
            const v = siteSettings[filters.key];
            return {
              data: v !== undefined ? { value: v } : null,
              error: null,
            };
          },
        };
      },
    }),
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import {
  computeCostMicros,
  loadConciergeConfig,
  loadAdminAgentConfig,
  preCheckCaps,
  recordUsage,
  capRejectionPayload,
  isCapsOverridden,
  _resetOverrideCache,
} from "@/lib/ai-cost-caps";

const TODAY = new Date().toISOString().slice(0, 10);

describe("ai-cost-caps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usageRows = [];
    siteSettings = {};
    upsertCalls.length = 0;
    _resetOverrideCache();
    delete process.env.AI_USER_DAILY_USD;
    delete process.env.AI_ADMIN_USER_DAILY_USD;
    delete process.env.AI_GLOBAL_PUBLIC_USD;
    delete process.env.AI_GLOBAL_ADMIN_USD;
  });

  describe("computeCostMicros", () => {
    it("uses Sonnet pricing for sonnet-4-20250514: $3 in / $15 out per MTok", () => {
      // 1M input tokens at $3/MTok = $3 = 3,000,000 micros = 3 * 1_000_000
      expect(computeCostMicros("claude-sonnet-4-20250514", 1_000_000, 0)).toBe(
        3_000_000,
      );
      // 1M output tokens at $15/MTok = $15 = 15_000_000 micros
      expect(computeCostMicros("claude-sonnet-4-20250514", 0, 1_000_000)).toBe(
        15_000_000,
      );
    });

    it("uses Opus pricing for claude-opus-4-6: $15 in / $75 out per MTok", () => {
      expect(computeCostMicros("claude-opus-4-6", 1_000_000, 0)).toBe(15_000_000);
      expect(computeCostMicros("claude-opus-4-6", 0, 1_000_000)).toBe(75_000_000);
    });

    it("falls back to Sonnet pricing for unknown models", () => {
      expect(computeCostMicros("totally-made-up-model", 1_000_000, 0)).toBe(
        3_000_000,
      );
    });

    it("returns 0 for zero tokens", () => {
      expect(computeCostMicros("claude-opus-4-6", 0, 0)).toBe(0);
    });
  });

  describe("loadConciergeConfig + loadAdminAgentConfig", () => {
    it("uses defaults ($5 user / $200 global concierge, $50 user / $100 global admin)", () => {
      const c = loadConciergeConfig();
      expect(c.perSubjectMicros).toBe(5_000_000);
      expect(c.globalMicros).toBe(200_000_000);
      const a = loadAdminAgentConfig();
      expect(a.perSubjectMicros).toBe(50_000_000);
      expect(a.globalMicros).toBe(100_000_000);
    });

    it("respects env overrides", () => {
      process.env.AI_USER_DAILY_USD = "10";
      process.env.AI_GLOBAL_PUBLIC_USD = "1000";
      const c = loadConciergeConfig();
      expect(c.perSubjectMicros).toBe(10_000_000);
      expect(c.globalMicros).toBe(1_000_000_000);
    });

    it("ignores invalid env values (NaN, ≤ 0)", () => {
      process.env.AI_USER_DAILY_USD = "-5";
      const c = loadConciergeConfig();
      expect(c.perSubjectMicros).toBe(5_000_000); // default
      process.env.AI_USER_DAILY_USD = "abc";
      const c2 = loadConciergeConfig();
      expect(c2.perSubjectMicros).toBe(5_000_000);
    });
  });

  describe("preCheckCaps", () => {
    it("allows when no usage rows exist", async () => {
      const cfg = loadConciergeConfig();
      const v = await preCheckCaps("ip:1.2.3.4", cfg);
      expect(v.allowed).toBe(true);
    });

    it("rejects with reason=per_subject when this subject is at cap", async () => {
      const cfg = loadConciergeConfig();
      usageRows.push({
        subject_id: "ip:1.2.3.4",
        subject_type: "public_session",
        route: "concierge",
        day: TODAY,
        tokens_in: 0,
        tokens_out: 0,
        cost_usd_micros: cfg.perSubjectMicros, // exactly at cap
        request_count: 1,
        alerted_80_at: null,
      });
      const v = await preCheckCaps("ip:1.2.3.4", cfg);
      expect(v.allowed).toBe(false);
      if (!v.allowed) {
        expect(v.reason).toBe("per_subject");
        expect(v.retryAfterSeconds).toBeGreaterThan(0);
      }
    });

    it("rejects with reason=global when total today is at cap (even if subject is below)", async () => {
      const cfg = loadConciergeConfig();
      // Spread the global cap across other subjects so this caller's
      // own row is below the per-subject cap but the global is at cap.
      usageRows.push({
        subject_id: "ip:other",
        subject_type: "public_session",
        route: "concierge",
        day: TODAY,
        tokens_in: 0,
        tokens_out: 0,
        cost_usd_micros: cfg.globalMicros,
        request_count: 1,
        alerted_80_at: null,
      });
      const v = await preCheckCaps("ip:1.2.3.4", cfg);
      expect(v.allowed).toBe(false);
      if (!v.allowed) expect(v.reason).toBe("global");
    });

    it("scopes the global sum by route — admin spend doesn't deplete the public budget", async () => {
      const concierge = loadConciergeConfig();
      // Pile up admin_agent spend to exceed the public global budget.
      usageRows.push({
        subject_id: "admin@x",
        subject_type: "admin_user",
        route: "admin_agent",
        day: TODAY,
        tokens_in: 0,
        tokens_out: 0,
        cost_usd_micros: concierge.globalMicros + 1,
        request_count: 1,
        alerted_80_at: null,
      });
      const v = await preCheckCaps("ip:1.2.3.4", concierge);
      expect(v.allowed).toBe(true);
    });

    it("allows everything when caps are overridden via site_settings", async () => {
      const cfg = loadConciergeConfig();
      siteSettings.ai_cost_caps_disabled = "true";
      _resetOverrideCache();
      // Even with usage at 1000x cap, override wins.
      usageRows.push({
        subject_id: "ip:1.2.3.4",
        subject_type: "public_session",
        route: "concierge",
        day: TODAY,
        tokens_in: 0,
        tokens_out: 0,
        cost_usd_micros: cfg.perSubjectMicros * 1000,
        request_count: 1,
        alerted_80_at: null,
      });
      const v = await preCheckCaps("ip:1.2.3.4", cfg);
      expect(v.allowed).toBe(true);
    });
  });

  describe("recordUsage", () => {
    it("creates a fresh row on first call and returns the new total", async () => {
      const cfg = loadConciergeConfig();
      const r = await recordUsage({
        subjectId: "ip:1.2.3.4",
        cfg,
        model: "claude-sonnet-4-20250514",
        tokensIn: 1000,
        tokensOut: 500,
      });
      // 1000 in × 3 + 500 out × 15 = 3000 + 7500 = 10500 micros
      expect(r.subjectMicros).toBe(10500);
      expect(r.crossed80Subject).toBe(false); // far from $4 (80% of $5)
      const row = usageRows[0];
      expect(row.tokens_in).toBe(1000);
      expect(row.tokens_out).toBe(500);
      expect(row.request_count).toBe(1);
    });

    it("accumulates across calls within the same day", async () => {
      const cfg = loadConciergeConfig();
      await recordUsage({
        subjectId: "ip:1.2.3.4",
        cfg,
        model: "claude-sonnet-4-20250514",
        tokensIn: 1000,
        tokensOut: 0,
      });
      const r = await recordUsage({
        subjectId: "ip:1.2.3.4",
        cfg,
        model: "claude-sonnet-4-20250514",
        tokensIn: 2000,
        tokensOut: 0,
      });
      // 1000*3 + 2000*3 = 9000 micros total
      expect(r.subjectMicros).toBe(9000);
      expect(usageRows[0].tokens_in).toBe(3000);
      expect(usageRows[0].request_count).toBe(2);
    });

    it("flags crossed80Subject only once when crossing the 80% line", async () => {
      const cfg = loadConciergeConfig();
      // Cap is $5 = 5,000,000 micros. 80% = 4,000,000.
      // Sonnet output = 15 micros/token. To hit $4 we need ~266667
      // output tokens. Easier: mock a big number.
      const BIG_OUT = 270_000;
      const r1 = await recordUsage({
        subjectId: "ip:1.2.3.4",
        cfg,
        model: "claude-sonnet-4-20250514",
        tokensIn: 0,
        tokensOut: BIG_OUT,
      });
      expect(r1.crossed80Subject).toBe(true);
      // Subsequent record should NOT re-flag — alerted_80_at is set.
      const r2 = await recordUsage({
        subjectId: "ip:1.2.3.4",
        cfg,
        model: "claude-sonnet-4-20250514",
        tokensIn: 0,
        tokensOut: BIG_OUT,
      });
      expect(r2.crossed80Subject).toBe(false);
    });

    it("does NOT cross 80% when usage stays below it", async () => {
      const cfg = loadConciergeConfig();
      const r = await recordUsage({
        subjectId: "ip:1.2.3.4",
        cfg,
        model: "claude-sonnet-4-20250514",
        tokensIn: 1000,
        tokensOut: 1000,
      });
      // 3000 + 15000 = 18000 micros = $0.018 — well under $4
      expect(r.crossed80Subject).toBe(false);
    });
  });

  describe("capRejectionPayload", () => {
    it("returns 429 with retry_after_seconds and a friendly per-subject message", () => {
      const cfg = loadConciergeConfig();
      const out = capRejectionPayload(
        { allowed: false, reason: "per_subject", retryAfterSeconds: 12345 },
        cfg,
      );
      expect(out.status).toBe(429);
      expect(out.body.reason).toBe("per_subject");
      expect(out.body.retry_after_seconds).toBe(12345);
      expect(out.body.error).toContain("daily limit");
      expect(out.headers["Retry-After"]).toBe("12345");
    });

    it("uses a different message for global cap", () => {
      const cfg = loadAdminAgentConfig();
      const out = capRejectionPayload(
        { allowed: false, reason: "global", retryAfterSeconds: 60 },
        cfg,
      );
      expect(out.body.error).toContain("global daily budget");
      expect(out.body.error).toContain("admin AI agent");
    });
  });

  describe("isCapsOverridden", () => {
    it("returns false when no setting row exists", async () => {
      _resetOverrideCache();
      expect(await isCapsOverridden()).toBe(false);
    });

    it("returns true when ai_cost_caps_disabled = 'true'", async () => {
      _resetOverrideCache();
      siteSettings.ai_cost_caps_disabled = "true";
      expect(await isCapsOverridden()).toBe(true);
    });

    it("is case-insensitive on the boolean value", async () => {
      _resetOverrideCache();
      siteSettings.ai_cost_caps_disabled = "TRUE";
      expect(await isCapsOverridden()).toBe(true);
      _resetOverrideCache();
      siteSettings.ai_cost_caps_disabled = "false";
      expect(await isCapsOverridden()).toBe(false);
    });
  });
});

describe("ai-cost-caps env edge cases", () => {
  let savedEnv: NodeJS.ProcessEnv;
  beforeEach(() => {
    savedEnv = { ...process.env };
  });
  afterEach(() => {
    process.env = savedEnv;
  });

  it("treats empty string env as unset (uses default)", () => {
    process.env.AI_USER_DAILY_USD = "";
    const c = loadConciergeConfig();
    expect(c.perSubjectMicros).toBe(5_000_000);
  });
});
