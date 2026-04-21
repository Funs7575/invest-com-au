import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: () => null,
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ in: () => ({ limit: async () => ({ data: [] }) }) }),
    }),
  }),
}));

vi.mock("@/lib/admin/classifier-config", () => ({
  isFeatureDisabled: async () => false,
}));

vi.mock("@/lib/job-queue", () => ({
  enqueueJob: vi.fn(async () => ({ id: "job-1" })),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: (s: string) => s,
}));

import {
  decideDunningStage,
  hoursSinceLastDunning,
} from "@/app/api/cron/subscription-dunning/route";

describe("decideDunningStage", () => {
  it("maps 0 attempts → stage 1 (soft warning)", () => {
    expect(decideDunningStage(0)).toBe(1);
  });

  it("maps 1 attempt → stage 2 (firm warning)", () => {
    expect(decideDunningStage(1)).toBe(2);
  });

  it("maps 2 attempts → stage 3 (final notice + grace period)", () => {
    expect(decideDunningStage(2)).toBe(3);
  });

  it("maps 3 attempts → stage 4 (cancellation notice)", () => {
    expect(decideDunningStage(3)).toBe(4);
  });

  it("clamps high attempt counts to stage 4 (keeps cancelling)", () => {
    expect(decideDunningStage(7)).toBe(4);
    expect(decideDunningStage(99)).toBe(4);
  });

  it("treats a negative attempt count (DB corruption) as stage 1", () => {
    // Defensive: a negative count means we haven't sent anything yet
    expect(decideDunningStage(-1)).toBe(1);
  });
});

describe("hoursSinceLastDunning", () => {
  const NOW = new Date("2026-04-20T12:00:00Z");

  it("returns Infinity when no email has been sent (null)", () => {
    expect(hoursSinceLastDunning(null, NOW)).toBe(Infinity);
  });

  it("returns Infinity when lastSent is a garbage string (NaN guard)", () => {
    expect(hoursSinceLastDunning("not-a-date", NOW)).toBe(Infinity);
  });

  it("returns ~24 hours for an email sent exactly 24h ago", () => {
    const yesterday = new Date("2026-04-19T12:00:00Z");
    expect(hoursSinceLastDunning(yesterday, NOW)).toBe(24);
  });

  it("returns a fractional hour count for short intervals", () => {
    const thirtyMinAgo = new Date("2026-04-20T11:30:00Z");
    expect(hoursSinceLastDunning(thirtyMinAgo, NOW)).toBe(0.5);
  });

  it("accepts an ISO string and a Date interchangeably", () => {
    const iso = "2026-04-19T12:00:00Z";
    const date = new Date(iso);
    expect(hoursSinceLastDunning(iso, NOW)).toBe(
      hoursSinceLastDunning(date, NOW),
    );
  });

  it("returns a negative value when lastSent is in the future (clock-skew edge)", () => {
    // Not ideal, but caller's 24h throttle will still hold
    const tomorrow = new Date("2026-04-21T12:00:00Z");
    expect(hoursSinceLastDunning(tomorrow, NOW)).toBe(-24);
  });
});
