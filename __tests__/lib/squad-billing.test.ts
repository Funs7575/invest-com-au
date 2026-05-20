import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import {
  getSquadBoost,
  getSquadBoosts,
  applySquadBoost,
  SQUAD_BOOST_MAX,
  SQUAD_BOOST_MIN,
} from "@/lib/squad-billing";

describe("applySquadBoost (pure)", () => {
  it("multiplies and clamps", () => {
    expect(applySquadBoost(100, 1.5)).toBe(150);
    expect(applySquadBoost(100, 99)).toBe(100 * SQUAD_BOOST_MAX);
    expect(applySquadBoost(100, 0.01)).toBe(100 * SQUAD_BOOST_MIN);
  });
});

describe("getSquadBoost", () => {
  beforeEach(() => mockFrom.mockReset());

  it("returns the boost for an active row", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { boost_weight: "2.0", active: true }, error: null }),
        }),
      }),
    });
    expect(await getSquadBoost(1)).toBe(2.0);
  });

  it("returns 1.0 when inactive", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { boost_weight: "2.0", active: false }, error: null }),
        }),
      }),
    });
    expect(await getSquadBoost(1)).toBe(1.0);
  });

  it("returns 1.0 when absent", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
    expect(await getSquadBoost(1)).toBe(1.0);
  });
});

describe("getSquadBoosts (batch)", () => {
  beforeEach(() => mockFrom.mockReset());

  it("defaults every requested id to 1.0 and overrides matched rows", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ team_id: 2, boost_weight: "1.8", active: true }],
            error: null,
          }),
        }),
      }),
    });
    const m = await getSquadBoosts([1, 2, 3]);
    expect(m.get(1)).toBe(1.0);
    expect(m.get(2)).toBe(1.8);
    expect(m.get(3)).toBe(1.0);
  });

  it("returns empty-defaults for empty input", async () => {
    const m = await getSquadBoosts([]);
    expect(m.size).toBe(0);
  });
});
