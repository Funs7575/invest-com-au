import { describe, it, expect, vi, beforeEach } from "vitest";

import type { BriefRow } from "@/lib/briefs/types";

type SupabaseFn = ReturnType<typeof vi.fn>;

const fromMock: SupabaseFn = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

function chainFor(rows: unknown[]) {
  // Self-returning Proxy so any chained call (`.select`, `.eq`, `.in`, `.or`,
  // `.contains`, etc.) keeps the chain alive without needing to enumerate
  // every PostgREST verb. `.limit()` and `await` resolve to the rows.
  const target: Record<string, unknown> = {
    limit: vi.fn(() => Promise.resolve({ data: rows, error: null })),
    then: (cb: (value: { data: unknown[]; error: null }) => unknown) =>
      cb({ data: rows, error: null }),
  };
  const proxy: object = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return (t as Record<string | symbol, unknown>)[prop];
      return () => proxy;
    },
  });
  return proxy as Record<string, unknown>;
}

function buildBrief(over: Partial<BriefRow> = {}): BriefRow {
  return {
    id: 99,
    slug: "x",
    flow_type: "accept",
    brief_template: "smsf_property",
    brief_payload: {},
    provider_preference: "any",
    routing_mode: "smart_match",
    target_professional_id: null,
    target_firm_id: null,
    target_team_id: null,
    accept_credits_cost: 25,
    accepted_by_professional_id: null,
    accepted_by_team_id: null,
    accepted_at: null,
    tracker_status: "new",
    risk_flags: [],
    risk_review_status: "clear",
    listing_id: null,
    job_title: "T",
    job_description: "D",
    budget_band: "10k_plus",
    advisor_types: null,
    location: "NSW",
    contact_name: null,
    contact_email: null,
    contact_phone: null,
    status: "open",
    ends_at: "2026-08-01T00:00:00Z",
    created_at: "2026-05-14T00:00:00Z",
    ...over,
  };
}

beforeEach(() => {
  fromMock.mockReset();
});

describe("resolveEligibleProviders", () => {
  it("returns only direct targets for routing_mode='direct'", async () => {
    const { resolveEligibleProviders } = await import("@/lib/briefs/routing");
    const brief = buildBrief({
      routing_mode: "direct",
      target_team_id: 7,
      target_professional_id: 42,
    });
    const result = await resolveEligibleProviders(brief);
    expect(result.find((r) => r.kind === "expert_team" && r.id === 7)).toBeDefined();
    expect(result.find((r) => r.kind === "individual" && r.id === 42)).toBeDefined();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("applies highest-priority matching rule first (smart_match)", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "brief_routing_rules") {
        return chainFor([
          {
            id: 1,
            name: "SMSF Property -> Expert Team first",
            priority: 10,
            enabled: true,
            match_conditions: { brief_template: "smsf_property" },
            route_to: { prefer: "expert_team", fallback: ["individual"] },
          },
        ]);
      }
      if (table === "expert_teams") {
        return chainFor([{ id: 11 }, { id: 12 }]);
      }
      if (table === "professionals") {
        return chainFor([{ id: 21, type: "smsf_accountant" }]);
      }
      if (table === "advisor_firms") {
        return chainFor([]);
      }
      return chainFor([]);
    });

    const { resolveEligibleProviders } = await import("@/lib/briefs/routing");
    const brief = buildBrief();
    const result = await resolveEligibleProviders(brief);
    const kinds = result.map((r) => r.kind);
    expect(kinds[0]).toBe("expert_team");
    expect(result.some((r) => r.kind === "individual" && r.id === 21)).toBe(true);
  });

  it("dedupes across preferred + fallback", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "brief_routing_rules") {
        return chainFor([
          {
            id: 1,
            name: "any",
            priority: 100,
            enabled: true,
            match_conditions: {},
            route_to: { prefer: "any" },
          },
        ]);
      }
      if (table === "expert_teams") return chainFor([{ id: 5 }]);
      if (table === "professionals") return chainFor([{ id: 5, type: null }]);
      if (table === "advisor_firms") return chainFor([{ id: 5 }]);
      return chainFor([]);
    });

    const { resolveEligibleProviders } = await import("@/lib/briefs/routing");
    const result = await resolveEligibleProviders(buildBrief());
    // Three different kinds with the same numeric id all kept.
    expect(result).toHaveLength(3);
    const keys = result.map((r) => `${r.kind}:${r.id}`).sort();
    expect(keys).toEqual([
      "expert_team:5",
      "firm:5",
      "individual:5",
    ]);
  });
});
