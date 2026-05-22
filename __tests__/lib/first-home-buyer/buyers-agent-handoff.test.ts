import { describe, it, expect } from "vitest";
import {
  FHB_BUYERS_AGENT_SPECIALTY,
  firstHomeBuyerBuyersAgentUrl,
} from "@/lib/first-home-buyer/buyers-agent-handoff";
import { SPECIALTIES_BY_TYPE } from "@/lib/advisor-specialties";

describe("first-home-buyer buyers-agent handoff", () => {
  it("uses a specialty that actually exists for buyers agents", () => {
    // Drift guard: the directory filters with an exact specialties.includes()
    // check, so this label must stay in the real buyers_agent specialty set.
    expect(SPECIALTIES_BY_TYPE.buyers_agent).toContain(
      FHB_BUYERS_AGENT_SPECIALTY,
    );
  });

  it("deep-links to the buyers-agent directory pre-filtered to FHB specialists", () => {
    expect(firstHomeBuyerBuyersAgentUrl()).toBe(
      "/advisors/buyers-agents?specialty=First+Home+Buyers",
    );
  });

  it("encodes a specialty value the directory can round-trip back", () => {
    const url = new URL(
      firstHomeBuyerBuyersAgentUrl(),
      "https://invest.com.au",
    );
    expect(url.pathname).toBe("/advisors/buyers-agents");
    expect(url.searchParams.get("specialty")).toBe(
      FHB_BUYERS_AGENT_SPECIALTY,
    );
  });
});
