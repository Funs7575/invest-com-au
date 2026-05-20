import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { getAgentBySlug, listActiveAgents } from "@/lib/agents-registry";

const ROW = {
  id: 4,
  principal_id: "p-4",
  number: 4,
  slug: "editorial",
  display_name: "Editorial",
  default_tier: 2,
  cadence: "daily",
  activates_post_afsl: false,
  deactivated_at: null,
};

describe("getAgentBySlug", () => {
  beforeEach(() => mockFrom.mockReset());

  it("maps a row", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: ROW, error: null }) }),
      }),
    });
    const a = await getAgentBySlug("editorial");
    expect(a).toEqual({
      id: 4,
      principalId: "p-4",
      number: 4,
      slug: "editorial",
      displayName: "Editorial",
      defaultTier: 2,
      cadence: "daily",
      activatesPostAfsl: false,
      deactivatedAt: null,
    });
  });

  it("returns null when absent", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
      }),
    });
    expect(await getAgentBySlug("nope")).toBeNull();
  });
});

describe("listActiveAgents", () => {
  beforeEach(() => mockFrom.mockReset());

  it("maps rows ordered by number", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [ROW], error: null }),
        }),
      }),
    });
    const agents = await listActiveAgents();
    expect(agents).toHaveLength(1);
    expect(agents[0]!.slug).toBe("editorial");
  });

  it("returns [] on error", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } }),
        }),
      }),
    });
    expect(await listActiveAgents()).toEqual([]);
  });
});
