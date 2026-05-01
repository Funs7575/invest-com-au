import { describe, it, expect } from "vitest";
import {
  ADVERTISER_DISCLOSURE,
  ADVERTISER_DISCLOSURE_SHORT,
  GENERAL_ADVICE_WARNING,
  CRYPTO_WARNING,
  CFD_WARNING,
  CFD_WARNING_SHORT,
  SPONSORED_DISCLOSURE,
  RISK_WARNING_CTA,
  PDS_CONSIDERATION,
  COMPANY_LEGAL_NAME,
  COMPANY_ACN,
  COMPANY_ABN,
  REGULATORY_NOTE,
  SUPER_WARNING,
  SUPER_WARNING_SHORT,
  AFCA_REFERENCE,
  CHESS_EXPLANATION,
  GAW_AI_PREFIX,
  filterFactualOutput,
  PERSONAL_ADVICE_PHRASES,
} from "@/lib/compliance";

describe("compliance constants", () => {
  it("all key exports are non-empty strings", () => {
    const exports = [
      ADVERTISER_DISCLOSURE,
      ADVERTISER_DISCLOSURE_SHORT,
      GENERAL_ADVICE_WARNING,
      CRYPTO_WARNING,
      CFD_WARNING,
      CFD_WARNING_SHORT,
      SPONSORED_DISCLOSURE,
      RISK_WARNING_CTA,
      PDS_CONSIDERATION,
      COMPANY_LEGAL_NAME,
      COMPANY_ACN,
      COMPANY_ABN,
      REGULATORY_NOTE,
      SUPER_WARNING,
      SUPER_WARNING_SHORT,
      AFCA_REFERENCE,
      CHESS_EXPLANATION,
    ];

    exports.forEach((val) => {
      expect(typeof val).toBe("string");
      expect(val.length).toBeGreaterThan(0);
    });
  });

  // The ADVERTISER_DISCLOSURE wording was updated to use "advertising and
  // referral fees" instead of "compensation" for clarity and ACL alignment.
  it("ADVERTISER_DISCLOSURE names the commercial relationship", () => {
    expect(ADVERTISER_DISCLOSURE.toLowerCase()).toMatch(
      /advertising|referral|compensation|commission/,
    );
  });

  it("CRYPTO_WARNING contains 'speculative'", () => {
    expect(CRYPTO_WARNING.toLowerCase()).toContain("speculative");
  });

  it("CFD_WARNING is non-empty and mentions risk", () => {
    expect(CFD_WARNING.length).toBeGreaterThan(0);
    expect(CFD_WARNING.toLowerCase()).toContain("risk");
    expect(CFD_WARNING).toContain("62%");
  });

  it("GENERAL_ADVICE_WARNING contains disclaimer language", () => {
    expect(GENERAL_ADVICE_WARNING.toLowerCase()).toContain(
      "not financial advice"
    );
  });

  it("SUPER_WARNING mentions insurance cover", () => {
    expect(SUPER_WARNING.toLowerCase()).toContain("insurance");
  });

  it("REGULATORY_NOTE contains company legal name", () => {
    expect(REGULATORY_NOTE).toContain(COMPANY_LEGAL_NAME);
    expect(REGULATORY_NOTE).toContain(COMPANY_ACN);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// V-NEW-02 — filterFactualOutput()
//
// AFSL/ASIC: every AI-produced text shipped to a user MUST pass this filter.
// Tests are organised one-rule-per-block; happy-path cases cover full
// integrations. Each test names the rule it exercises so a failure points
// straight at the broken rule rather than to a vague "filter regression".
// ─────────────────────────────────────────────────────────────────────────────

describe("filterFactualOutput — Rule 1: personal-advice phrases", () => {
  // Helper: build a snippet that PASSES every other rule, so any failure
  // is solely attributable to the personal-advice phrase under test.
  const wrapWithGawAndCitations = (body: string) => `${GAW_AI_PREFIX} ${body}`;

  it("rejects 'you should' (canonical second-person directive)", () => {
    const result = filterFactualOutput(
      wrapWithGawAndCitations("You should compare brokers."),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectedSpans.some((s) => s.rule === "personal-advice-phrase")).toBe(
        true,
      );
    }
  });

  it("rejects 'You shouldn't' — word-boundary catches contractions of 'you should'", () => {
    // RG 36 treats prohibitive personal directives ("you shouldn't") as
    // equally personal-advice-y as affirmative ones; the trailing-loose
    // boundary on the regex is intentional.
    const result = filterFactualOutput(
      wrapWithGawAndCitations("You shouldn't ignore the PDS."),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects 'WE RECOMMEND' (case-insensitive)", () => {
    const result = filterFactualOutput(
      wrapWithGawAndCitations("WE RECOMMEND you read the PDS."),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectedSpans.some((s) => s.rule === "personal-advice-phrase")).toBe(
        true,
      );
    }
  });

  it("rejects every advertised personal-advice phrase", () => {
    // Defence-in-depth: iterate the exported list so a future addition to
    // PERSONAL_ADVICE_PHRASES is automatically covered without an
    // explicit test edit. Use `${phrase} something` so the regex
    // word-boundary at the start always fires.
    for (const phrase of PERSONAL_ADVICE_PHRASES) {
      const sample = wrapWithGawAndCitations(
        `${phrase} something about brokers.`,
      );
      const result = filterFactualOutput(sample);
      expect(result.ok, `phrase "${phrase}" should reject`).toBe(false);
    }
  });

  it("does NOT reject the substring 'should' inside a benign word", () => {
    // 'shoulder' contains 'should' but is not a personal-advice phrase.
    // Word-boundary protection at the start of "you should" prevents a
    // false positive here.
    const result = filterFactualOutput(
      wrapWithGawAndCitations("Shoulder taps are not personal advice."),
    );
    expect(result.ok).toBe(true);
  });

  it("does NOT reject 'recommend' on its own — only 'we recommend' / 'i recommend' / 'personally recommend'", () => {
    // Standalone "recommend" without a personal pronoun is general
    // commentary, not personal advice. Important: we want to avoid
    // over-rejecting factual descriptions like "ASIC recommends...".
    const result = filterFactualOutput(
      wrapWithGawAndCitations("ASIC recommends reading the PDS."),
    );
    expect(result.ok).toBe(true);
  });
});

describe("filterFactualOutput — Rule 2: GAW prefix enforcement", () => {
  it("rejects text without any accepted GAW prefix", () => {
    const result = filterFactualOutput(
      "Brokers vary in fees and features. Compare PDSs.",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectedSpans.some((s) => s.rule === "missing-gaw-prefix")).toBe(
        true,
      );
    }
  });

  it("accepts text that starts with GAW_AI_PREFIX", () => {
    const result = filterFactualOutput(
      `${GAW_AI_PREFIX} Compare brokers in the directory.`,
    );
    expect(result.ok).toBe(true);
  });

  it("accepts text that starts with the full GENERAL_ADVICE_WARNING", () => {
    // Some AI surfaces will pre-pend the long form for screen-reader
    // users; both must pass.
    const result = filterFactualOutput(
      `${GENERAL_ADVICE_WARNING} Compare brokers in the directory.`,
    );
    expect(result.ok).toBe(true);
  });

  it("accepts text that starts with RISK_WARNING_CTA", () => {
    const result = filterFactualOutput(
      `${RISK_WARNING_CTA} Compare brokers in the directory.`,
    );
    expect(result.ok).toBe(true);
  });

  it("accepts text with leading whitespace before the GAW prefix", () => {
    // LLM streams sometimes start with `\n`; we should not reject for
    // that alone if the prefix appears immediately after.
    const result = filterFactualOutput(
      `\n  ${GAW_AI_PREFIX} Compare brokers in the directory.`,
    );
    expect(result.ok).toBe(true);
  });
});

describe("filterFactualOutput — Rule 3: markdown link safety", () => {
  it("preserves https:// links", () => {
    const result = filterFactualOutput(
      `${GAW_AI_PREFIX} See [ASIC](https://asic.gov.au) for more.`,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cleaned).toContain("[ASIC](https://asic.gov.au)");
    }
  });

  it("preserves rooted relative links (start with '/')", () => {
    // Internal nav like /best/etoro is safe — it stays on our own domain.
    const result = filterFactualOutput(
      `${GAW_AI_PREFIX} See [our directory](/brokers) for more.`,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cleaned).toContain("[our directory](/brokers)");
    }
  });

  it("strips http:// links to bare link-text and rejects", () => {
    // Plain http:// is a downgrade attack vector + ASIC RG 234 expects
    // verifiable sources, so we treat it as unsafe.
    const result = filterFactualOutput(
      `${GAW_AI_PREFIX} Visit [example](http://example.com).`,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectedSpans.some((s) => s.rule === "unsafe-markdown-link")).toBe(
        true,
      );
    }
  });

  it("strips bare-relative links (no leading '/') to bare link-text and rejects", () => {
    // `best/etoro` (no leading slash) is ambiguous — could mean a path on
    // any host depending on rendering context — so we treat it as unsafe.
    const result = filterFactualOutput(
      `${GAW_AI_PREFIX} Visit [a page](best/etoro).`,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectedSpans.some((s) => s.rule === "unsafe-markdown-link")).toBe(
        true,
      );
    }
  });
});

describe("filterFactualOutput — Rule 4: stat-citation enforcement", () => {
  it("rejects an uncited percentage like 8.5%", () => {
    const result = filterFactualOutput(
      `${GAW_AI_PREFIX} Returns averaged 8.5% in the period.`,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectedSpans.some((s) => s.rule === "uncited-numeric-stat")).toBe(
        true,
      );
    }
  });

  it("rejects an uncited dollar amount like $50,000", () => {
    const result = filterFactualOutput(
      `${GAW_AI_PREFIX} The minimum balance is $50,000.`,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectedSpans.some((s) => s.rule === "uncited-numeric-stat")).toBe(
        true,
      );
    }
  });

  it("accepts a percentage immediately followed by a (source: ...) citation", () => {
    const result = filterFactualOutput(
      `${GAW_AI_PREFIX} Returns averaged 8.5% (source: ASX 2025 annual report).`,
    );
    expect(result.ok).toBe(true);
  });

  it("accepts a dollar amount immediately followed by a [^N] footnote marker", () => {
    const result = filterFactualOutput(
      `${GAW_AI_PREFIX} The minimum balance is $50,000[^1].`,
    );
    expect(result.ok).toBe(true);
  });
});

describe("filterFactualOutput — multi-rule overlap", () => {
  it("reports every rule that fires for a maximally bad input", () => {
    // No GAW prefix + personal-advice phrase + uncited stat + bare-relative
    // link — every rule should fire so the founder can re-prompt the LLM
    // with a complete diagnostic, not a 'first failure wins' summary.
    const result = filterFactualOutput(
      "You should buy 8.5% bonds via [this link](broker/eToro).",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const rules = new Set(result.rejectedSpans.map((s) => s.rule));
      expect(rules.has("missing-gaw-prefix")).toBe(true);
      expect(rules.has("personal-advice-phrase")).toBe(true);
      expect(rules.has("uncited-numeric-stat")).toBe(true);
      expect(rules.has("unsafe-markdown-link")).toBe(true);
    }
  });
});

describe("filterFactualOutput — empty / edge inputs", () => {
  it("rejects empty string", () => {
    const result = filterFactualOutput("");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectedSpans.some((s) => s.rule === "empty-input")).toBe(true);
    }
  });

  it("rejects whitespace-only string", () => {
    const result = filterFactualOutput("   \n\t  ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejectedSpans.some((s) => s.rule === "empty-input")).toBe(true);
    }
  });
});

describe("filterFactualOutput — happy-path snippets", () => {
  it("passes a basic factual sentence with the short GAW prefix", () => {
    const result = filterFactualOutput(
      `${GAW_AI_PREFIX} Australian brokers must hold an AFSL to deal in shares.`,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cleaned.length).toBeGreaterThan(0);
    }
  });

  it("passes a multi-sentence factual reply with safe https:// links and cited stats", () => {
    // Note: the rule is strict — every stat needs its OWN immediately-following
    // citation. So we mark each stat individually with a footnote rather than
    // sharing one parenthesised citation across both, which would reject the
    // first stat as uncited.
    const result = filterFactualOutput(
      `${GAW_AI_PREFIX} Most retail CFD accounts lose money — between 62%[^1] and 81%[^1]. See [ASIC's CFD guidance](https://asic.gov.au) for more.`,
    );
    expect(result.ok).toBe(true);
  });

  it("passes a reply that uses RISK_WARNING_CTA + an internal link + a footnote-cited stat", () => {
    const result = filterFactualOutput(
      `${RISK_WARNING_CTA} Industry CFD-loss figures sit at 62%[^1]. See [our CFD comparison](/cfd) for the full directory.`,
    );
    expect(result.ok).toBe(true);
  });
});
