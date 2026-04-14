import { describe, it, expect } from "vitest";
import {
  classifyDispute,
  classifySpam,
  classifyWrongSpecialty,
  classifyOutOfArea,
  classifyUnreachable,
  classifyDuplicate,
  classifyUnderMinimum,
  type ClassifierContext,
  type LeadForClassifier,
  type AdvisorForClassifier,
  type DisputeReason,
} from "@/lib/advisor-lead-disputes";

// ─── Test fixtures ───────────────────────────────────────────────────

function makeLead(overrides: Partial<LeadForClassifier> = {}): LeadForClassifier {
  return {
    id: 1,
    user_name: "Jane Smith",
    user_email: "jane.smith@gmail.com",
    user_phone: "+61412345678",
    message: "Hi, I'm looking for help with my SMSF setup. Please get in touch.",
    source_page: "/advisors/smsf-accountants",
    utm_source: null,
    utm_campaign: null,
    quality_score: 60,
    quality_signals: { has_phone: true, has_message: true },
    bill_amount_cents: 4900,
    created_at: new Date().toISOString(),
    responded_at: null,
    ...overrides,
  };
}

function makeAdvisor(
  overrides: Partial<AdvisorForClassifier> = {},
): AdvisorForClassifier {
  return {
    id: 42,
    type: "smsf_accountant",
    specialties: ["SMSF Setup", "SMSF Compliance"],
    location_state: "NSW",
    office_states: null,
    service_areas: null,
    min_client_balance_cents: null,
    accepts_international_clients: true,
    ...overrides,
  };
}

function makeCtx(
  reason: DisputeReason,
  lead: Partial<LeadForClassifier> = {},
  advisor: Partial<AdvisorForClassifier> = {},
  priorLeadsByEmail = 0,
  details: string | null = null,
): ClassifierContext {
  return {
    lead: makeLead(lead),
    advisor: makeAdvisor(advisor),
    reason,
    details,
    priorLeadsByEmail,
  };
}

// ─── "other" always escalates ────────────────────────────────────────

describe("classifyDispute — other", () => {
  it("always escalates free-text reasons", () => {
    const r = classifyDispute(makeCtx("other"));
    expect(r.verdict).toBe("escalate");
    expect(r.confidence).toBe("low");
  });
});

// ─── spam_or_fake ────────────────────────────────────────────────────

describe("classifySpam", () => {
  it("refunds when name is garbage AND email local is random-looking", () => {
    const r = classifySpam(
      makeCtx("spam_or_fake", {
        user_name: "asdf",
        user_email: "xkqzjbrw@example.com",
        message: null,
      }),
    );
    expect(r.verdict).toBe("refund");
    expect(r.confidence).toBe("high");
    expect(r.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("refunds when name is test word AND quality score is very low", () => {
    const r = classifySpam(
      makeCtx("spam_or_fake", {
        user_name: "test",
        user_email: "test@test.com",
        quality_score: 0,
        message: "test",
      }),
    );
    expect(r.verdict).toBe("refund");
  });

  it("escalates when only one spam signal is present", () => {
    const r = classifySpam(
      makeCtx("spam_or_fake", {
        user_name: "Al", // too short — 1 signal
        user_email: "alex.johnson@gmail.com", // valid
        message: "Hi, I'd like to schedule a consultation about my retirement planning next month.",
        quality_score: 70,
        user_phone: "+61412345678",
      }),
    );
    expect(r.verdict).toBe("escalate");
    expect(r.confidence).toBe("medium");
  });

  it("rejects when no spam signals are detected at all", () => {
    const r = classifySpam(
      makeCtx("spam_or_fake", {
        user_name: "Alexandra Johnson",
        user_email: "alex.johnson@gmail.com",
        user_phone: "+61412345678",
        message: "I need help setting up an SMSF for my family trust structure.",
        quality_score: 80,
      }),
    );
    expect(r.verdict).toBe("reject");
    expect(r.confidence).toBe("high");
  });

  it("refunds on repeated-digit phones + other signals", () => {
    const r = classifySpam(
      makeCtx("spam_or_fake", {
        user_name: "Bo",
        user_email: "testbot@test.com",
        user_phone: "9999999999",
        message: null,
        quality_score: 0,
      }),
    );
    expect(r.verdict).toBe("refund");
  });
});

// ─── wrong_specialty ─────────────────────────────────────────────────

describe("classifyWrongSpecialty", () => {
  it("escalates when advisor has no specialties listed", () => {
    const r = classifyWrongSpecialty(
      makeCtx("wrong_specialty", {}, { specialties: [] }),
    );
    expect(r.verdict).toBe("escalate");
  });

  it("escalates when only source page mismatch fires (one signal)", () => {
    const r = classifyWrongSpecialty(
      makeCtx(
        "wrong_specialty",
        { source_page: "/crypto" },
        { type: "smsf_accountant", specialties: ["SMSF Setup"] },
      ),
    );
    expect(r.verdict).toBe("escalate");
    expect(r.confidence).toBe("medium");
  });

  it("refunds when source page mismatch AND qualification interest mismatch", () => {
    const r = classifyWrongSpecialty(
      makeCtx(
        "wrong_specialty",
        {
          source_page: "/crypto",
          quality_signals: {
            qualification: { data: { interest: "crypto trading" } },
          },
        },
        { type: "smsf_accountant", specialties: ["SMSF Setup"] },
      ),
    );
    expect(r.verdict).toBe("refund");
  });

  it("escalates when no signals match", () => {
    const r = classifyWrongSpecialty(makeCtx("wrong_specialty"));
    expect(r.verdict).toBe("escalate");
  });
});

// ─── out_of_area ─────────────────────────────────────────────────────

describe("classifyOutOfArea", () => {
  it("rejects when advisor services all of AU (no restriction)", () => {
    const r = classifyOutOfArea(
      makeCtx("out_of_area", {}, { office_states: null, service_areas: null }),
    );
    expect(r.verdict).toBe("reject");
    expect(r.confidence).toBe("high");
  });

  it("refunds when user state is outside the advisor's service area", () => {
    const r = classifyOutOfArea(
      makeCtx(
        "out_of_area",
        {
          quality_signals: { qualification: { data: { state: "VIC" } } },
        },
        { office_states: ["NSW", "QLD"] },
      ),
    );
    expect(r.verdict).toBe("refund");
  });

  it("refunds when email domain is international AND advisor is AU-only", () => {
    const r = classifyOutOfArea(
      makeCtx(
        "out_of_area",
        { user_email: "someone@bigfirm.co.uk" },
        {
          office_states: ["NSW"],
          accepts_international_clients: false,
        },
      ),
    );
    expect(r.verdict).toBe("refund");
  });

  it("escalates when user state is unknown and no international signal", () => {
    const r = classifyOutOfArea(
      makeCtx("out_of_area", {}, { office_states: ["NSW"] }),
    );
    expect(r.verdict).toBe("escalate");
  });
});

// ─── unreachable ─────────────────────────────────────────────────────

describe("classifyUnreachable", () => {
  it("refunds when phone is too short", () => {
    const r = classifyUnreachable(
      makeCtx("unreachable", { user_phone: "123" }),
    );
    expect(r.verdict).toBe("refund");
  });

  it("refunds when email domain is a placeholder", () => {
    const r = classifyUnreachable(
      makeCtx("unreachable", { user_email: "foo@test.example" }),
    );
    expect(r.verdict).toBe("refund");
  });

  it("escalates when contact details look valid", () => {
    const r = classifyUnreachable(makeCtx("unreachable"));
    expect(r.verdict).toBe("escalate");
  });
});

// ─── duplicate ───────────────────────────────────────────────────────

describe("classifyDuplicate", () => {
  it("refunds when prior leads exist from the same email", () => {
    const r = classifyDuplicate(makeCtx("duplicate", {}, {}, 2));
    expect(r.verdict).toBe("refund");
    expect(r.confidence).toBe("high");
  });

  it("rejects when no prior leads", () => {
    const r = classifyDuplicate(makeCtx("duplicate", {}, {}, 0));
    expect(r.verdict).toBe("reject");
  });
});

// ─── under_minimum ───────────────────────────────────────────────────

describe("classifyUnderMinimum", () => {
  it("rejects when advisor has no minimum set", () => {
    const r = classifyUnderMinimum(
      makeCtx("under_minimum", {}, { min_client_balance_cents: null }),
    );
    expect(r.verdict).toBe("reject");
  });

  it("refunds when portfolio is below minimum", () => {
    const r = classifyUnderMinimum(
      makeCtx(
        "under_minimum",
        {
          quality_signals: {
            qualification: { data: { portfolio_size_cents: 5_000_000 } },
          },
        },
        { min_client_balance_cents: 25_000_000 },
      ),
    );
    expect(r.verdict).toBe("refund");
  });

  it("rejects when portfolio meets minimum", () => {
    const r = classifyUnderMinimum(
      makeCtx(
        "under_minimum",
        {
          quality_signals: {
            qualification: { data: { portfolio_size_cents: 50_000_000 } },
          },
        },
        { min_client_balance_cents: 25_000_000 },
      ),
    );
    expect(r.verdict).toBe("reject");
  });

  it("escalates when portfolio size not captured", () => {
    const r = classifyUnderMinimum(
      makeCtx("under_minimum", {}, { min_client_balance_cents: 25_000_000 }),
    );
    expect(r.verdict).toBe("escalate");
  });
});

// ─── Top-level dispatch ──────────────────────────────────────────────

describe("classifyDispute (dispatch)", () => {
  it("dispatches spam_or_fake to the spam classifier", () => {
    const r = classifyDispute(
      makeCtx("spam_or_fake", {
        user_name: "asdf",
        user_email: "test@test.com",
        message: null,
        quality_score: 0,
      }),
    );
    expect(r.verdict).toBe("refund");
  });

  it("dispatches duplicate to the duplicate classifier", () => {
    const r = classifyDispute(makeCtx("duplicate", {}, {}, 3));
    expect(r.verdict).toBe("refund");
  });
});
