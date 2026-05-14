import { describe, it, expect } from "vitest";
import { maskBriefForProvider } from "@/lib/briefs/mask";
import type { BriefRow } from "@/lib/briefs/types";

function row(over: Partial<BriefRow> = {}): BriefRow {
  return {
    id: 1,
    slug: "sample-brief",
    flow_type: "accept",
    brief_template: "smsf_property",
    brief_payload: { smsf_status: "no_smsf" },
    provider_preference: "expert_team",
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
    job_title: "SMSF property strategy",
    job_description: "Long description...".padEnd(400, "x"),
    budget_band: "10k_plus",
    advisor_types: null,
    location: "NSW",
    contact_name: "Alice Smith",
    contact_email: "alice@example.com",
    contact_phone: "+61400000000",
    status: "open",
    ends_at: "2026-08-01T00:00:00Z",
    created_at: "2026-05-14T00:00:00Z",
    ...over,
  };
}

describe("maskBriefForProvider", () => {
  it("strips contact details", () => {
    const masked = maskBriefForProvider(row());
    expect(masked).not.toHaveProperty("contact_email");
    expect(masked).not.toHaveProperty("contact_name");
    expect(masked).not.toHaveProperty("contact_phone");
  });

  it("retains routing + budget + template fields", () => {
    const masked = maskBriefForProvider(row());
    expect(masked.budget_band).toBe("10k_plus");
    expect(masked.location).toBe("NSW");
    expect(masked.brief_template).toBe("smsf_property");
    expect(masked.provider_preference).toBe("expert_team");
    expect(masked.routing_mode).toBe("smart_match");
    expect(masked.accept_credits_cost).toBe(25);
  });

  it("truncates the description preview", () => {
    const masked = maskBriefForProvider(row());
    expect(masked.description_preview.length).toBeLessThanOrEqual(281);
    expect(masked.description_preview.endsWith("…")).toBe(true);
  });

  it("keeps short descriptions untruncated", () => {
    const masked = maskBriefForProvider(
      row({ job_description: "Short description." }),
    );
    expect(masked.description_preview).toBe("Short description.");
  });
});
