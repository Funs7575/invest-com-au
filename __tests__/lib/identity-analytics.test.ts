import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import {
  getMultiKindCohorts,
  getWorkspaceSwitchStats,
  multiHatShare,
} from "@/lib/identity-analytics";

describe("multiHatShare (pure)", () => {
  it("returns 0 for empty cohorts", () => {
    expect(multiHatShare([])).toBe(0);
  });
  it("computes the 2+-kinds share", () => {
    const cohorts = [
      { kindsHeld: 1, principalCount: 70 },
      { kindsHeld: 2, principalCount: 20 },
      { kindsHeld: 3, principalCount: 10 },
    ];
    expect(multiHatShare(cohorts)).toBeCloseTo(0.3, 5);
  });
});

describe("getMultiKindCohorts", () => {
  beforeEach(() => mockFrom.mockReset());
  it("maps view rows", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            { kinds_held: 1, principal_count: "70" },
            { kinds_held: 2, principal_count: "20" },
          ],
          error: null,
        }),
      }),
    });
    const cohorts = await getMultiKindCohorts();
    expect(cohorts).toEqual([
      { kindsHeld: 1, principalCount: 70 },
      { kindsHeld: 2, principalCount: 20 },
    ]);
  });
  it("returns [] on error", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } }),
      }),
    });
    expect(await getMultiKindCohorts()).toEqual([]);
  });
});

describe("getWorkspaceSwitchStats", () => {
  beforeEach(() => mockFrom.mockReset());
  it("maps view rows with numeric coercion", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          {
            kind: "advisor",
            source: "switcher",
            switch_count: "12",
            distinct_principals: "5",
            last_switch_at: "2026-05-20T00:00:00Z",
          },
        ],
        error: null,
      }),
    });
    const stats = await getWorkspaceSwitchStats();
    expect(stats[0]).toEqual({
      kind: "advisor",
      source: "switcher",
      switchCount: 12,
      distinctPrincipals: 5,
      lastSwitchAt: "2026-05-20T00:00:00Z",
    });
  });
});
