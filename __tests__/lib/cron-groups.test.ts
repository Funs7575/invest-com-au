import { describe, it, expect } from "vitest";
import { CRON_GROUPS } from "@/lib/cron-groups";

describe("CRON_GROUPS invariants", () => {
  it("every path starts with /api/cron/ or /api/admin/", () => {
    for (const [group, paths] of Object.entries(CRON_GROUPS)) {
      for (const p of paths) {
        expect(p, `${group}: ${p}`).toMatch(/^\/api\/(cron|admin)\//);
      }
    }
  });

  it("no path appears twice in the same group", () => {
    for (const [group, paths] of Object.entries(CRON_GROUPS)) {
      const set = new Set(paths);
      expect(
        set.size,
        `group '${group}' has duplicate entries`,
      ).toBe(paths.length);
    }
  });

  it("every group key matches a known cadence shape", () => {
    for (const group of Object.keys(CRON_GROUPS)) {
      expect(group).toMatch(
        /^(every-\d+[mh]|hourly-\d+|daily-\d+(-\d+)?|weekly-(sun|mon|tue|wed|thu|fri|sat)-\d+|monthly-\d+-\d+)$/,
      );
    }
  });

  it("registers the new ops-hygiene crons", () => {
    const all = Object.values(CRON_GROUPS).flat();
    // Crons added this session — if any of these go missing the alert
    // machinery stops working.
    expect(all).toContain("/api/cron/cron-health-alert");
    expect(all).toContain("/api/cron/observability-retention");
    expect(all).toContain("/api/cron/broker-review-invites");
    expect(all).toContain("/api/cron/versus-editorial-backfill");
    expect(all).toContain("/api/cron/exit-intent-nurture");
    expect(all).toContain("/api/cron/stale-fee-editorial");
    expect(all).toContain("/api/cron/affiliate-payout-recon");
    expect(all).toContain("/api/cron/sponsored-placement-apply");
  });
});
