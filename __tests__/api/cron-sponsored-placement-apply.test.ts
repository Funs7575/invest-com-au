import { describe, it, expect, vi } from "vitest";

// Mocks must register before the route import so the hoisted
// evaluation order picks them up.
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

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    }),
  }),
}));

import { sponsorshipEndMatches } from "@/app/api/cron/sponsored-placement-apply/route";

describe("sponsorshipEndMatches — guards against stomping later bookings", () => {
  it("matches identical ISO strings", () => {
    const iso = "2026-05-01T00:00:00.000Z";
    expect(sponsorshipEndMatches(iso, iso)).toBe(true);
  });

  it("matches two representations of the same instant (Z vs +00:00)", () => {
    // Postgres may emit `+00:00`; JS-constructed dates use `Z`.
    expect(
      sponsorshipEndMatches(
        "2026-05-01T00:00:00.000Z",
        "2026-05-01T00:00:00+00:00",
      ),
    ).toBe(true);
  });

  it("matches strings differing only by timezone shift that resolves to the same instant", () => {
    // 2026-05-01T10:00 +10:00 == 2026-05-01T00:00 UTC
    expect(
      sponsorshipEndMatches(
        "2026-05-01T10:00:00+10:00",
        "2026-05-01T00:00:00.000Z",
      ),
    ).toBe(true);
  });

  it("does NOT match when the broker has a LATER sponsorship_end (typical overlap case)", () => {
    // Prior booking ends 2026-05-01; a later booking has already been
    // applied setting the broker's sponsorship_end to 2026-06-01.
    // The sweep must NOT clear the broker here.
    expect(
      sponsorshipEndMatches(
        "2026-06-01T00:00:00.000Z",
        "2026-05-01T00:00:00.000Z",
      ),
    ).toBe(false);
  });

  it("does NOT match when the broker has an EARLIER sponsorship_end", () => {
    expect(
      sponsorshipEndMatches(
        "2026-04-01T00:00:00.000Z",
        "2026-05-01T00:00:00.000Z",
      ),
    ).toBe(false);
  });

  it("does NOT match when a different millisecond", () => {
    expect(
      sponsorshipEndMatches(
        "2026-05-01T00:00:00.000Z",
        "2026-05-01T00:00:00.001Z",
      ),
    ).toBe(false);
  });

  it("returns false when brokerEnd is null (broker has no sponsorship to stomp)", () => {
    expect(sponsorshipEndMatches(null, "2026-05-01T00:00:00.000Z")).toBe(false);
  });

  it("returns false when brokerEnd is undefined", () => {
    expect(
      sponsorshipEndMatches(undefined, "2026-05-01T00:00:00.000Z"),
    ).toBe(false);
  });

  it("returns false when brokerEnd is an invalid date string", () => {
    expect(
      sponsorshipEndMatches("not-a-date", "2026-05-01T00:00:00.000Z"),
    ).toBe(false);
  });

  it("returns false when booking ends_at is an invalid date string", () => {
    // Should never happen in practice — DB column is NOT NULL
    // timestamptz — but the helper shouldn't throw if it does.
    expect(
      sponsorshipEndMatches("2026-05-01T00:00:00.000Z", "not-a-date"),
    ).toBe(false);
  });

  it("returns false when brokerEnd is an empty string", () => {
    expect(sponsorshipEndMatches("", "2026-05-01T00:00:00.000Z")).toBe(false);
  });
});
