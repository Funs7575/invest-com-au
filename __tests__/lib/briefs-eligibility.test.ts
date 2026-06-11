import { describe, it, expect } from "vitest";

import { isBriefVisibleToProvider } from "@/lib/briefs/eligibility";
import type { BriefRow } from "@/lib/briefs/types";

function makeBrief(overrides: Partial<BriefRow> = {}): BriefRow {
  return {
    id: 7,
    slug: "test-brief",
    flow_type: "accept",
    brief_template: "general",
    brief_payload: {},
    provider_preference: "any",
    routing_mode: "smart_match",
    target_professional_id: null,
    target_firm_id: null,
    target_team_id: null,
    accept_credits_cost: 2,
    accepted_by_professional_id: null,
    accepted_by_team_id: null,
    accepted_at: null,
    tracker_status: "new",
    risk_flags: [],
    risk_review_status: "clear",
    listing_id: null,
    job_title: "Help",
    job_description: "desc",
    budget_band: "2k_5k",
    advisor_types: null,
    location: "NSW",
    contact_name: null,
    contact_email: null,
    status: "open",
    ends_at: "2026-07-01T00:00:00.000Z",
    created_at: "2026-06-10T00:00:00.000Z",
    ...overrides,
  };
}

const baseCtx = {
  professionalId: 42,
  advisorType: "financial_planner",
  firmId: null as number | null,
  teamIds: [] as number[],
};

describe("isBriefVisibleToProvider", () => {
  it("any-preference briefs are visible to a plain individual", () => {
    expect(isBriefVisibleToProvider(makeBrief(), baseCtx)).toBe(true);
  });

  it("direct briefs are only visible to the targeted professional / team / firm", () => {
    const direct = makeBrief({ routing_mode: "direct", target_professional_id: 42 });
    expect(isBriefVisibleToProvider(direct, baseCtx)).toBe(true);
    expect(isBriefVisibleToProvider(direct, { ...baseCtx, professionalId: 43 })).toBe(false);

    const teamDirect = makeBrief({ routing_mode: "direct", target_team_id: 9 });
    expect(isBriefVisibleToProvider(teamDirect, { ...baseCtx, teamIds: [9] })).toBe(true);
    expect(isBriefVisibleToProvider(teamDirect, baseCtx)).toBe(false);

    const firmDirect = makeBrief({ routing_mode: "direct", target_firm_id: 5 });
    expect(isBriefVisibleToProvider(firmDirect, { ...baseCtx, firmId: 5 })).toBe(true);
    expect(isBriefVisibleToProvider(firmDirect, { ...baseCtx, firmId: 6 })).toBe(false);
  });

  it("expert_team preference requires an active team membership", () => {
    const brief = makeBrief({ provider_preference: "expert_team" });
    expect(isBriefVisibleToProvider(brief, baseCtx)).toBe(false);
    expect(isBriefVisibleToProvider(brief, { ...baseCtx, teamIds: [3] })).toBe(true);
  });

  it("firm preference requires a firm", () => {
    const brief = makeBrief({ provider_preference: "firm" });
    expect(isBriefVisibleToProvider(brief, baseCtx)).toBe(false);
    expect(isBriefVisibleToProvider(brief, { ...baseCtx, firmId: 2 })).toBe(true);
  });

  it("advisor_types filter applies only when both sides declare a type", () => {
    const brief = makeBrief({ advisor_types: ["mortgage_broker"] });
    expect(isBriefVisibleToProvider(brief, baseCtx)).toBe(false);
    expect(
      isBriefVisibleToProvider(brief, { ...baseCtx, advisorType: "mortgage_broker" }),
    ).toBe(true);
    // Pro with no type assigned is not excluded (matches inbox behaviour).
    expect(isBriefVisibleToProvider(brief, { ...baseCtx, advisorType: null })).toBe(true);
  });
});
