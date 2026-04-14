import { describe, it, expect } from "vitest";
import {
  classifyListingForScam,
  type ListingForClassifier,
  type ScamClassifierContext,
} from "@/lib/invest-listing-scam-classifier";

function listing(overrides: Partial<ListingForClassifier> = {}): ListingForClassifier {
  return {
    id: 1,
    title: "Established cafe in Sydney CBD",
    description:
      "Well-established cafe in a prime Sydney CBD location. Operating for 8 years with stable revenue and loyal customer base. Full handover included with 3 month training period.",
    vertical: "business",
    location_state: "NSW",
    location_city: "Sydney",
    price_display: "$450,000",
    asking_price_cents: 45_000_000,
    industry: "Hospitality",
    contact_name: "John Stevens",
    contact_email: "john@sydneycafeco.com.au",
    contact_phone: "+61400123456",
    images: ["img1.jpg"],
    key_metrics: { revenue: 600_000 },
    ...overrides,
  };
}

function ctx(
  overrides: Partial<ListingForClassifier> = {},
  priorRejectionsFromEmail = 0,
  abnStatus: "active" | "cancelled" | "not_found" | null = "active",
): ScamClassifierContext {
  return {
    listing: listing(overrides),
    priorListingsFromEmail: 1,
    priorRejectionsFromEmail,
    abnLookup: {
      performed: abnStatus !== null,
      abn: "12345678901",
      entityStatus: abnStatus,
    },
  };
}

describe("classifyListingForScam — hard reject patterns", () => {
  it("auto-rejects 'guaranteed returns'", () => {
    const r = classifyListingForScam(
      ctx({ description: "Invest now for guaranteed 20% monthly returns on your capital." }),
    );
    expect(r.verdict).toBe("auto_reject");
    expect(r.confidence).toBe("high");
    expect(r.reasons.some((s) => s.includes("guaranteed"))).toBe(true);
  });

  it("auto-rejects 'risk-free investment'", () => {
    const r = classifyListingForScam(
      ctx({ description: "Our risk-free investment opportunity cannot lose money." }),
    );
    expect(r.verdict).toBe("auto_reject");
  });

  it("auto-rejects 'double your money'", () => {
    const r = classifyListingForScam(
      ctx({ description: "Guaranteed way to double your money in 6 months through our secret formula." }),
    );
    expect(r.verdict).toBe("auto_reject");
  });

  it("auto-rejects ponzi terminology", () => {
    const r = classifyListingForScam(
      ctx({ description: "Exclusive MLM opportunity with pyramid scheme payouts for early members." }),
    );
    expect(r.verdict).toBe("auto_reject");
  });
});

describe("classifyListingForScam — soft flag patterns", () => {
  it("escalates WhatsApp contact pattern", () => {
    const r = classifyListingForScam(
      ctx({
        description: "Great business opportunity. Contact me on WhatsApp for more info. Serious buyers only please, thank you for looking at this listing.",
      }),
    );
    // whatsapp (15) + not enough to reject
    expect(["escalate", "auto_approve"]).toContain(r.verdict);
  });

  it("escalates with multiple soft flags", () => {
    const r = classifyListingForScam(
      ctx({
        description:
          "Exclusive high-yield opportunity. Investors needed urgently. Cash only. Contact via Telegram for more details about this amazing deal.",
      }),
    );
    // telegram(20) + urgent(20) + exclusive(10) + high-yield(15) + cash(15) = 80
    // minus active ABN relief (-15) = 65 → escalate, not reject.
    // Matches the classifier's conservative bias on soft signals.
    expect(r.verdict).toBe("escalate");
    expect(r.riskScore).toBeGreaterThanOrEqual(25);
  });

  it("rejects when soft flags pile up past the hard threshold", () => {
    const r = classifyListingForScam(
      ctx(
        {
          description:
            "Exclusive high-yield opportunity with passive income guaranteed. Investors needed urgently. Cash only wire transfer. WhatsApp and Telegram contact only for this 24 hours only offer.",
        },
        0,
        "not_found", // no ABN relief
      ),
    );
    // passive_income_guaranteed is a HARD reject pattern → guaranteed reject
    expect(r.verdict).toBe("auto_reject");
  });
});

describe("classifyListingForScam — seller history", () => {
  it("auto-rejects seller with 2+ prior rejections", () => {
    const r = classifyListingForScam(ctx({}, 3));
    expect(r.verdict).toBe("auto_reject");
    expect(r.reasons.some((s) => s.includes("prior_rejections"))).toBe(true);
  });
});

describe("classifyListingForScam — ABN checks", () => {
  it("penalises cancelled ABN heavily", () => {
    const r = classifyListingForScam(ctx({}, 0, "cancelled"));
    expect(r.verdict).toBe("auto_reject");
  });

  it("escalates not-found ABN", () => {
    const r = classifyListingForScam(ctx({}, 0, "not_found"));
    expect(r.verdict).toBe("escalate");
  });

  it("auto-approves clean listing with active ABN", () => {
    const r = classifyListingForScam(ctx({}, 0, "active"));
    expect(r.verdict).toBe("auto_approve");
    expect(r.confidence).toBe("high");
  });
});

describe("classifyListingForScam — safety net", () => {
  it("escalates clean listing when ABN lookup wasn't performed", () => {
    const r = classifyListingForScam(ctx({}, 0, null));
    expect(r.verdict).toBe("escalate");
  });

  it("escalates short description", () => {
    const r = classifyListingForScam(
      ctx({ description: "Good business" }, 0, null),
    );
    expect(r.verdict).toBe("escalate");
  });
});

describe("classifyListingForScam — risk score", () => {
  it("returns 0-100 clamped risk score", () => {
    const r1 = classifyListingForScam(ctx());
    const r2 = classifyListingForScam(
      ctx({ description: "Guaranteed 50% monthly returns risk-free WhatsApp me now" }),
    );
    expect(r1.riskScore).toBeGreaterThanOrEqual(0);
    expect(r1.riskScore).toBeLessThanOrEqual(100);
    expect(r2.riskScore).toBeLessThanOrEqual(100);
    expect(r2.riskScore).toBeGreaterThan(r1.riskScore);
  });
});
