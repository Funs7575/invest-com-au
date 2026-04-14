import { describe, it, expect } from "vitest";
import {
  classifyCampaign,
  type CampaignForClassifier,
} from "@/lib/marketplace-campaign-classifier";

function makeCampaign(overrides: Partial<CampaignForClassifier> = {}): CampaignForClassifier {
  return {
    id: 1,
    broker_slug: "acme",
    inventory_type: "cpc",
    budget_cents: 50_000,
    start_date: "2026-05-01",
    end_date: "2026-05-31",
    creative_headline: "Trade ASX shares from $3",
    creative_body: "Professional trading platform with CHESS sponsorship",
    landing_url: "https://acmebroker.com.au/offer",
    cta_text: "Open Account",
    brokerAccountActive: true,
    landingDomainMatches: true,
    hasBudget: true,
    priorApprovedCount: 5,
    priorRejectedCount: 0,
    ...overrides,
  };
}

describe("classifyCampaign — hard rejects", () => {
  it("rejects if broker account is not active", () => {
    const r = classifyCampaign(makeCampaign({ brokerAccountActive: false }));
    expect(r.verdict).toBe("auto_reject");
  });

  it("rejects guaranteed returns creative", () => {
    const r = classifyCampaign(
      makeCampaign({ creative_body: "Guaranteed 20% returns on all trades" }),
    );
    expect(r.verdict).toBe("auto_reject");
  });

  it("rejects insufficient wallet balance", () => {
    const r = classifyCampaign(makeCampaign({ hasBudget: false }));
    expect(r.verdict).toBe("auto_reject");
  });
});

describe("classifyCampaign — escalation paths", () => {
  it("escalates landing domain mismatch", () => {
    const r = classifyCampaign(
      makeCampaign({
        landingDomainMatches: false,
        landing_url: "https://suspicious.com/redirect",
      }),
    );
    expect(r.verdict).toBe("escalate");
  });

  it("escalates when broker has 3+ prior rejections", () => {
    const r = classifyCampaign(makeCampaign({ priorRejectedCount: 4 }));
    expect(r.verdict).toBe("escalate");
  });

  it("escalates first campaign from a new broker", () => {
    const r = classifyCampaign(makeCampaign({ priorApprovedCount: 0 }));
    expect(r.verdict).toBe("escalate");
  });
});

describe("classifyCampaign — auto-approve path", () => {
  it("auto-approves clean campaign from trusted broker", () => {
    const r = classifyCampaign(makeCampaign());
    expect(r.verdict).toBe("auto_approve");
    expect(r.confidence).toBe("high");
  });
});
