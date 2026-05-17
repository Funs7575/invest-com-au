import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom, mockGetIntent, mockGetEnabledIntents } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetIntent: vi.fn(),
  mockGetEnabledIntents: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock("@/lib/getmatched/intents", () => ({
  getIntent: mockGetIntent,
  getEnabledIntents: mockGetEnabledIntents,
}));

import {
  generateAllCombos,
  getSquadTopicData,
  listTeamLeadMagnetUrls,
} from "@/lib/squad-lead-magnet";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSquadTopicData", () => {
  it("returns null when squad is not verified", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "expert_teams") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 1,
                  slug: "abc",
                  name: "ABC",
                  verification_status: "pending",
                  specialty_slugs: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });
    mockGetIntent.mockResolvedValue({ slug: "smsf_property", label: "SMSF", description: null });
    expect(await getSquadTopicData("abc", "smsf_property")).toBeNull();
  });

  it("returns null when topic isn't in the squad's specialty list", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "expert_teams") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 1,
                  slug: "abc",
                  name: "ABC",
                  verification_status: "verified",
                  specialty_slugs: ["financial_advice"],
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });
    mockGetIntent.mockResolvedValue({ slug: "smsf_property", label: "SMSF", description: null });
    expect(await getSquadTopicData("abc", "smsf_property")).toBeNull();
  });
});

describe("generateAllCombos", () => {
  it("respects the team's specialty_slugs (max 3 per team)", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  slug: "team-a",
                  specialty_slugs: ["smsf_property", "tax_help", "buy_property", "financial_advice"],
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    }));
    mockGetEnabledIntents.mockResolvedValue([
      { slug: "smsf_property", label: "SMSF" },
      { slug: "tax_help", label: "Tax" },
      { slug: "buy_property", label: "Buy" },
      { slug: "financial_advice", label: "Advice" },
    ]);
    const combos = await generateAllCombos();
    expect(combos.length).toBe(3); // capped at 3 per team
    expect(combos.map((c) => c.topic_slug)).toEqual([
      "smsf_property",
      "tax_help",
      "buy_property",
    ]);
  });

  it("falls back to top 3 enabled intents when team has no specialty_slugs", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [{ slug: "team-a", specialty_slugs: null }],
              error: null,
            }),
          }),
        }),
      }),
    }));
    mockGetEnabledIntents.mockResolvedValue([
      { slug: "smsf_property", label: "SMSF" },
      { slug: "tax_help", label: "Tax" },
      { slug: "buy_property", label: "Buy" },
      { slug: "financial_advice", label: "Advice" },
    ]);
    const combos = await generateAllCombos();
    expect(combos.length).toBe(3);
    expect(combos[0]?.team_slug).toBe("team-a");
  });
});

describe("listTeamLeadMagnetUrls", () => {
  it("returns paths in /teams/[slug]/topic/[topic] format", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { specialty_slugs: ["smsf_property", "tax_help"] },
            error: null,
          }),
        }),
      }),
    }));
    mockGetEnabledIntents.mockResolvedValue([
      { slug: "smsf_property", label: "SMSF" },
      { slug: "tax_help", label: "Tax" },
      { slug: "buy_property", label: "Buy" },
    ]);
    const urls = await listTeamLeadMagnetUrls("team-a");
    expect(urls).toEqual([
      "/teams/team-a/topic/smsf_property",
      "/teams/team-a/topic/tax_help",
    ]);
  });
});
