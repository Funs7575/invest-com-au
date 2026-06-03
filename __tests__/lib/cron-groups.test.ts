import { describe, it, expect } from "vitest";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { CRON_GROUPS } from "@/lib/cron-groups";

// Cron handlers that intentionally run on demand (admin-triggered, manual
// backfills) rather than on a dispatcher schedule. Keep this list tight —
// anything here is excluded from the registration-parity gate below.
const ON_DEMAND_CRONS = new Set<string>([]);

function discoverCronHandlers(): string[] {
  const cronDir = join(process.cwd(), "app/api/cron");
  if (!existsSync(cronDir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(cronDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    // The dispatcher route fans out to grouped handlers — it is not itself
    // a schedulable handler.
    if (entry.name === "dispatch") continue;
    if (existsSync(join(cronDir, entry.name, "route.ts"))) {
      out.push(`/api/cron/${entry.name}`);
    }
  }
  return out;
}

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
        /^(every-\d+[mh]|hourly-\d+|daily-\d+(-\d+)?|weekly-(sun|mon|tue|wed|thu|fri|sat)-\d+|monthly-\d+-\d+|quarterly-\d+-\d+)$/,
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

  it("registers the marketplace re-engagement crons", () => {
    const all = Object.values(CRON_GROUPS).flat();
    expect(all).toContain("/api/cron/plan-resume-digest");
    expect(all).toContain("/api/cron/saved-search-alerts");
  });

  // Registration-parity gate: every cron route handler on disk must be wired
  // into a dispatcher group (or explicitly listed as on-demand), otherwise it
  // silently never fires. This catches the failure mode where a new
  // /api/cron/* handler is added but nobody adds it to CRON_GROUPS.
  it("every cron handler on disk is registered in a dispatcher group", () => {
    const registered = new Set(
      Object.values(CRON_GROUPS)
        .flat()
        .filter((p) => p.startsWith("/api/cron/")),
    );
    const handlers = discoverCronHandlers();
    expect(handlers.length, "no cron handlers discovered on disk").toBeGreaterThan(0);

    const unregistered = handlers.filter(
      (h) => !registered.has(h) && !ON_DEMAND_CRONS.has(h),
    );
    expect(
      unregistered,
      `cron handlers exist on disk but are not in any CRON_GROUPS group (they will never fire): ${unregistered.join(", ")}`,
    ).toEqual([]);
  });

  it("every registered cron path has a handler on disk", () => {
    const handlers = new Set(discoverCronHandlers());
    const registeredCron = Object.values(CRON_GROUPS)
      .flat()
      .filter((p) => p.startsWith("/api/cron/"));
    const dangling = registeredCron.filter((p) => !handlers.has(p));
    expect(
      dangling,
      `CRON_GROUPS references paths with no route.ts on disk: ${dangling.join(", ")}`,
    ).toEqual([]);
  });
});
