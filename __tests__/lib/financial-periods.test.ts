import { describe, it, expect, beforeEach, vi } from "vitest";

interface PeriodRow {
  id: number;
  period_start: string;
  period_end: string;
  status: string;
  closed_at: string | null;
  closed_by: string | null;
  revenue_summary: Record<string, unknown> | null;
  total_refunds_cents: number | null;
  total_credits_cents: number | null;
  audit_row_count: number | null;
  notes: string | null;
}

interface AuditRow {
  created_at: string;
  action: string;
  amount_cents: number | null;
}

let periodRows: PeriodRow[] = [];
let auditRows: AuditRow[] = [];
let nextId = 1;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    const builder = (table: string) => {
      const state: {
        op: "select" | "insert" | "update" | "upsert";
        periodStart?: string;
        periodEnd?: string;
        statusEq?: string;
        lteStart?: string;
        gteEnd?: string;
        createdGte?: string;
        createdLte?: string;
        upsertPayload?: Partial<PeriodRow>;
        updatePayload?: Partial<PeriodRow>;
        isPeriods: boolean;
        isAudit: boolean;
      } = {
        op: "select",
        isPeriods: table === "financial_periods",
        isAudit: table === "financial_audit_log",
      };

      const api: Record<string, unknown> = {};
      api.select = () => api;

      api.upsert = (payload: Partial<PeriodRow>) => {
        if (state.isPeriods) {
          const existing = periodRows.find(
            (r) =>
              r.period_start === payload.period_start &&
              r.period_end === payload.period_end,
          );
          if (existing) {
            Object.assign(existing, payload);
          } else {
            periodRows.push({
              id: nextId++,
              period_start: payload.period_start || "",
              period_end: payload.period_end || "",
              status: payload.status || "open",
              closed_at: payload.closed_at ?? null,
              closed_by: payload.closed_by ?? null,
              revenue_summary: payload.revenue_summary ?? null,
              total_refunds_cents: payload.total_refunds_cents ?? null,
              total_credits_cents: payload.total_credits_cents ?? null,
              audit_row_count: payload.audit_row_count ?? null,
              notes: payload.notes ?? null,
            });
          }
        }
        return Promise.resolve({ error: null });
      };

      api.update = (payload: Partial<PeriodRow>) => {
        state.updatePayload = payload;
        state.op = "update";
        return api;
      };

      api.eq = (col: string, val: string) => {
        if (col === "period_start") state.periodStart = val;
        if (col === "period_end") state.periodEnd = val;
        if (col === "status") state.statusEq = val;
        return api;
      };
      api.lte = (col: string, val: string) => {
        if (col === "period_start") state.lteStart = val;
        if (col === "created_at") state.createdLte = val;
        return api;
      };
      api.gte = (col: string, val: string) => {
        if (col === "period_end") state.gteEnd = val;
        if (col === "created_at") state.createdGte = val;
        return api;
      };
      api.limit = () => api;
      api.order = () => api;

      api.maybeSingle = () => {
        if (state.isPeriods) {
          const match = periodRows.find(
            (r) =>
              (!state.periodStart || r.period_start === state.periodStart) &&
              (!state.periodEnd || r.period_end === state.periodEnd) &&
              (!state.statusEq || r.status === state.statusEq) &&
              (!state.lteStart || r.period_start <= state.lteStart) &&
              (!state.gteEnd || r.period_end >= state.gteEnd),
          );
          return Promise.resolve({ data: match || null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      };

      api.single = () => {
        if (state.op === "update" && state.updatePayload && state.isPeriods) {
          const match = periodRows.find(
            (r) =>
              r.period_start === state.periodStart &&
              r.period_end === state.periodEnd,
          );
          if (match) {
            Object.assign(match, state.updatePayload);
            return Promise.resolve({ data: { ...match }, error: null });
          }
        }
        return Promise.resolve({ data: null, error: null });
      };

      api.then = (resolve: (v: unknown) => void) => {
        if (state.isPeriods) {
          const matched = periodRows.filter(
            (r) =>
              (!state.statusEq || r.status === state.statusEq) &&
              (!state.lteStart || r.period_start <= state.lteStart) &&
              (!state.gteEnd || r.period_end >= state.gteEnd),
          );
          return resolve({ data: matched, error: null });
        }
        if (state.isAudit) {
          const matched = auditRows.filter(
            (r) =>
              (!state.createdGte || r.created_at >= state.createdGte) &&
              (!state.createdLte || r.created_at <= state.createdLte),
          );
          return resolve({ data: matched, error: null });
        }
        return resolve({ data: [], error: null });
      };
      return api;
    };
    return { from: builder };
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
  getPeriod,
  closePeriod,
  isPeriodClosedAt,
  previousMonthBounds,
} from "@/lib/financial-periods";

beforeEach(() => {
  periodRows = [];
  auditRows = [];
  nextId = 1;
});

describe("previousMonthBounds", () => {
  it("computes prior month range from a given date", () => {
    const bounds = previousMonthBounds(new Date("2026-04-14T00:00:00Z"));
    expect(bounds.start).toBe("2026-03-01");
    expect(bounds.end).toBe("2026-03-31");
  });

  it("wraps to December when called in January", () => {
    const bounds = previousMonthBounds(new Date("2026-01-15T00:00:00Z"));
    expect(bounds.start).toBe("2025-12-01");
    expect(bounds.end).toBe("2025-12-31");
  });
});

describe("closePeriod", () => {
  it("rolls up audit rows and marks the period closed", async () => {
    auditRows = [
      { created_at: "2026-03-02T10:00:00Z", action: "credit", amount_cents: 1000 },
      { created_at: "2026-03-15T10:00:00Z", action: "credit", amount_cents: 2000 },
      { created_at: "2026-03-20T10:00:00Z", action: "refund", amount_cents: 500 },
      { created_at: "2026-04-01T10:00:00Z", action: "credit", amount_cents: 9999 }, // outside
    ];
    const result = await closePeriod({
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      closedBy: "cron",
    });
    expect(result.ok).toBe(true);
    expect(result.summary?.audit_row_count).toBe(3);
    expect(result.summary?.total_credits_cents).toBe(3000);
    expect(result.summary?.total_refunds_cents).toBe(500);
    const stored = await getPeriod("2026-03-01", "2026-03-31");
    expect(stored?.status).toBe("closed");
  });

  it("is idempotent on a closed period", async () => {
    await closePeriod({
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      closedBy: "cron",
    });
    const second = await closePeriod({
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      closedBy: "cron",
    });
    expect(second.ok).toBe(true);
    expect(second.reason).toBe("already_closed");
  });
});

describe("isPeriodClosedAt", () => {
  it("returns true when the date falls inside a closed period", async () => {
    await closePeriod({
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      closedBy: "cron",
    });
    const closed = await isPeriodClosedAt(new Date("2026-03-15T12:00:00Z"));
    expect(closed).toBe(true);
  });

  it("returns false when the period is still open", async () => {
    // No rows at all — should be false
    const closed = await isPeriodClosedAt(new Date("2026-03-15T12:00:00Z"));
    expect(closed).toBe(false);
  });
});
